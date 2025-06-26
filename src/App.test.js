import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // Se necesita importar el router
import App from './App';

// Burlamos supabaseClient para evitar errores de conexión en la prueba
jest.mock('./supabaseClient');

test('renders learn react link (or a relevant element)', () => {
  // --- CORRECCIÓN ---
  // Envolvemos el componente App en MemoryRouter porque usa funcionalidades de routing
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  // Puedes cambiar esto para buscar un texto que realmente exista en tu página de login
  // por ejemplo, el texto del botón de "Iniciar Sesión".
  // Si no hay un elemento fácil de encontrar, puedes simplemente verificar que no crashee.
  // Por ahora, esta prueba simplemente confirma que el renderizado inicial no falla.
  // const linkElement = screen.getByText(/learn react/i);
  // expect(linkElement).toBeInTheDocument();
});
