import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { InstitutionProvider } from './contexts/InstitutionContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <InstitutionProvider>
          <App />
        </InstitutionProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
