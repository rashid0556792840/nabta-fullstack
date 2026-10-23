import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { LanguageProvider } from './i18n/LanguageContext';
import { CompanyProvider } from './context/CompanyContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { ToastProvider } from './context/ToastContext';
import { setupNativeApp } from './native';
import './styles.css';

setupNativeApp();

// HashRouter (URLs like /#/shop) works on any static host - Render, Tomcat, a file server -
// and inside the Android app, without extra rewrite rules.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <LanguageProvider>
        <CompanyProvider>
          <ToastProvider>
            <AuthProvider>
              <FavoritesProvider>
                <CartProvider>
                  <App />
                </CartProvider>
              </FavoritesProvider>
            </AuthProvider>
          </ToastProvider>
        </CompanyProvider>
      </LanguageProvider>
    </HashRouter>
  </StrictMode>
);
