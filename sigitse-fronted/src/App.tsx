import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth-context';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import './App.css';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <Login />;
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
