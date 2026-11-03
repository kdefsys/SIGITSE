// Run only against an explicitly isolated, migrated test database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const request = require('supertest');
const bcrypt = require('bcrypt');
const { AppModule } = require('../dist/app.module');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { ItseService } = require('../dist/itse/itse.service');

if (!process.env.DATABASE_URL?.includes('/sigitse_regression')) {
  throw new Error('Use a dedicated database whose name starts with sigitse_regression.');
}
process.env.JWT_SECRET = 'isolated-integration-test-secret-at-least-32-characters';

test('review reasons survive HTTP reload and subsequent approval; invalid writes are atomic', async () => {
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  const db = app.get(PrismaService);
  const service = app.get(ItseService);
  const users = [];
  let caseId;
  try {
    const password = 'isolated-test-password';
    const hash = await bcrypt.hash(password, 4);
    for (const role of ['ADMINISTRADO', 'INSPECTOR', 'ADMIN', 'ADMINISTRADO', 'ADMINISTRADO']) {
      users.push(await db.user.create({ data: { email: `review-${crypto.randomUUID()}@example.test`, name: role, role, password: hash } }));
    }
    const tokens = [];
    for (const user of users) {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email: user.email, password }).expect(200);
      tokens.push(res.body.token.access_token);
    }
    const owner = tokens[0], inspector = tokens[1], admin = tokens[2], stranger = tokens[3];
    const funcionario = tokens[4];
    const api = request(app.getHttpServer());
    // Existing sessions use the role currently stored in the database.
    await api.patch(`/admin/users/${users[4].id}/role`).auth(admin, { type: 'bearer' }).send({ role: 'FUNCIONARIO' }).expect(200);
    await api.get('/admin/users').auth(admin, { type: 'bearer' }).expect(200);
    for (const token of [funcionario, inspector, owner]) {
      await api.get('/admin/users').auth(token, { type: 'bearer' }).expect(403);
      await api.patch(`/admin/users/${users[0].id}/role`).auth(token, { type: 'bearer' }).send({ role: 'ADMIN' }).expect(403);
    }
    await api.post('/auth/register').send({ name: 'Forged', email: 'forged@example.test', password, role: 'FUNCIONARIO' }).expect(400);
    for (const token of [admin, inspector, funcionario]) {
      await api.post('/itse').auth(token, { type: 'bearer' }).send({ title: 'Forbidden', description: 'Forbidden' }).expect(403);
    }
    const created = await api.post('/itse').auth(owner, { type: 'bearer' }).send({ title: 'Regression test', description: 'Synthetic data only' }).expect(201);
    caseId = created.body.id;
    await api.get('/itse').auth(admin, { type: 'bearer' }).expect(403);
    await api.get(`/itse/${caseId}`).auth(admin, { type: 'bearer' }).expect(403);
    await api.get(`/itse/${caseId}/documents/1/download`).auth(admin, { type: 'bearer' }).expect(403);
    await api.get(`/itse/${caseId}`).auth(inspector, { type: 'bearer' }).expect(404);
    for (const token of [admin, inspector, owner]) {
      await api.patch(`/itse/${caseId}/assign-inspector`).auth(token, { type: 'bearer' }).send({ inspectorId: users[1].id }).expect(403);
      await api.patch(`/itse/${caseId}/review`).auth(token, { type: 'bearer' }).send({ action: 'OBSERVADO', observation: 'Forbidden' }).expect(403);
    }
    for (const token of [admin, inspector, funcionario]) {
      await api.post(`/itse/${caseId}/payment`).auth(token, { type: 'bearer' }).send({ receiptNumber: 'forbidden', amount: 1 }).expect(403);
      await api.post(`/itse/${caseId}/upload`).auth(token, { type: 'bearer' }).expect(403);
    }
    const inspectors = await api.get('/itse/inspectors').auth(funcionario, { type: 'bearer' }).expect(200);
    assert.ok(inspectors.body.some(x => x.id === users[1].id));
    for (const token of [admin, inspector, owner]) {
      await api.get('/itse/inspectors').auth(token, { type: 'bearer' }).expect(403);
    }
    await api.patch(`/itse/${caseId}/assign-inspector`).auth(funcionario, { type: 'bearer' }).send({ inspectorId: users[1].id }).expect(200);
    await api.get(`/itse/${caseId}`).auth(inspector, { type: 'bearer' }).expect(200);
    await api.patch(`/itse/${caseId}/review`).auth(funcionario, { type: 'bearer' }).send({ action: 'OBSERVADO', observation: '  Falta declaración firmada  ' }).expect(200);
    let listing = await api.get('/itse').auth(owner, { type: 'bearer' }).expect(200);
    let expediente = listing.body.find(x => x.id === caseId);
    assert.equal(expediente.status, 'OBSERVADO');
    const review = expediente.history.find(x => x.action === 'ESTADO_ACTUALIZADO');
    assert.ok(review.description.includes('Falta declaración firmada'));
    assert.equal(review.actor.id, users[4].id);
    assert.ok(review.createdAt);
    assert.equal(review.actor.password, undefined);
    for (const observation of [undefined, '', '   ']) {
      await api.patch(`/itse/${caseId}/review`).auth(funcionario, { type: 'bearer' }).send({ action: 'RECHAZADO', observation }).expect(400);
    }
    await api.patch(`/itse/${caseId}/review`).auth(stranger, { type: 'bearer' }).send({ action: 'OBSERVADO', observation: 'Unauthorized' }).expect(403);
    const outsider = await api.get('/itse').auth(stranger, { type: 'bearer' }).expect(200);
    assert.equal(outsider.body.some(x => x.id === caseId), false);
    await api.patch(`/itse/${caseId}/review`).auth(funcionario, { type: 'bearer' }).send({ action: 'APROBADO' }).expect(200);
    listing = await api.get('/itse').auth(owner, { type: 'bearer' }).expect(200);
    expediente = listing.body.find(x => x.id === caseId);
    assert.equal(expediente.status, 'APROBADO');
    const reviews = expediente.history.filter(x => x.action === 'ESTADO_ACTUALIZADO');
    assert.deepEqual(reviews.map(x => x.toStatus), ['APROBADO', 'OBSERVADO']);
    assert.ok(reviews[1].description.includes('Falta declaración firmada'));
    // Force a history FK failure: status and history must both remain unchanged.
    await assert.rejects(service.reviewRequest(caseId, { action: 'RECHAZADO', observation: 'Must roll back' }, -1, 'FUNCIONARIO'));
    const saved = await db.itseRequest.findUnique({ where: { id: caseId }, include: { history: true } });
    assert.equal(saved.status, 'APROBADO');
    assert.equal(saved.history.filter(x => x.action === 'ESTADO_ACTUALIZADO').length, 2);
  } finally {
    if (caseId) await db.itseRequest.delete({ where: { id: caseId } });
    await db.user.deleteMany({ where: { id: { in: users.map(x => x.id) } } });
    await app.close();
  }
});
