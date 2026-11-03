import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReviewAction, ReviewItseDto } from './review-itse.dto';

describe('ReviewItseDto', () => {
  it.each([undefined, '', '   ', null, 123])(
    'rejects an observation without a valid reason (%s)',
    async (observation) => {
      const dto = plainToInstance(ReviewItseDto, {
        action: ReviewAction.OBSERVAR,
        observation,
      });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    },
  );
  it('trims a valid reason', async () => {
    const dto = plainToInstance(ReviewItseDto, {
      action: ReviewAction.RECHAZAR,
      observation: '  Falta declaración  ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.observation).toBe('Falta declaración');
  });
  it('allows approval without a reason', async () => {
    expect(
      await validate(
        plainToInstance(ReviewItseDto, { action: ReviewAction.APROBAR }),
      ),
    ).toHaveLength(0);
  });
});
