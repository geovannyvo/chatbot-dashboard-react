// src/SetInitialPasswordPage.js
// (Asegúrate que la ruta a supabaseClient sea correcta si está en una subcarpeta)
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { supabase, updateUserPasswordChangeFlag } from './supabaseClient'; 
// 'useNavigate' ya no es necesario aquí para la redirección principal.
// 'useOutletContext' tampoco es estrictamente necesario si obtenemos el user desde supabase.auth.getUser().

const colors = { // Mantén o ajusta tus variables de color
    textPrimary: 'var(--wa-dark-text-primary, #e9edef)',
    textSec: 'var(--wa-dark-text-sec, #8696a0)',
    bgMain: 'var(--wa-dark-bg-main, #111b21)',
    bgSec: 'var(--wa-dark-bg-sec, #202c33)',
    border: 'var(--wa-dark-border, #374045)',
    accent: 'var(--wa-dark-accent, #00a884)',
    alert: 'var(--wa-dark-alert, #f44336)',
};

const commonInputStyle = {
  width: '100%',
  padding: '12px',
  marginBottom: '15px',
  border: `1px solid ${colors.border}`,
  borderRadius: '4px',
  backgroundColor: colors.bgSec, 
  color: colors.textPrimary,
  boxSizing: 'border-box', // Ya debería ser global por App.css
};

const commonButtonStyle = {
  width: '100%',
  padding: '12px',
  border: 'none',
  borderRadius: '20px',
  backgroundColor: colors.accent,
  color: 'white',
  fontWeight: 'bold',
  fontSize: '16px',
  cursor: 'pointer',
  transition: 'filter 0.2s ease',
  marginTop: '10px',
};


function SetInitialPasswordPage({ onPasswordAndFlagUpdated }) { 
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("SetInitialPasswordPage: handleSubmit iniciado.");

    if (newPassword.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Las nuevas contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    console.log("SetInitialPasswordPage: setLoading(true)");

    // 1. Obtener el usuario actual (para su ID)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      toast.error("Error de autenticación. No se pudo obtener el usuario actual. Intenta iniciar sesión de nuevo.");
      console.error("SetInitialPasswordPage: Error obteniendo usuario actual o no hay usuario:", userError);
      setLoading(false);
      return;
    }
    console.log("SetInitialPasswordPage: Usuario actual obtenido:", user.id);

    // 2. Actualizar la contraseña en Supabase Auth
    console.log("SetInitialPasswordPage: Intentando actualizar contraseña en Supabase Auth...");
    const { error: updateAuthError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateAuthError) {
      // El error "New password should be different from the old password" es común aquí
      toast.error(`Error al actualizar la contraseña: ${updateAuthError.message}`);
      console.error("SetInitialPasswordPage: Error en supabase.auth.updateUser:", updateAuthError);
      setLoading(false);
      return;
    }
    console.log("SetInitialPasswordPage: Contraseña actualizada en Supabase Auth exitosamente.");

    // 3. Actualizar el flag needs_password_change en tu tabla 'profiles'
    console.log("SetInitialPasswordPage: Intentando actualizar flag needs_password_change a false para el usuario:", user.id);
    const flagUpdated = await updateUserPasswordChangeFlag(user.id, false);
    console.log("SetInitialPasswordPage: Resultado de updateUserPasswordChangeFlag:", flagUpdated);
    
    setLoading(false); 

    if (flagUpdated) {
      toast.success("Contraseña y perfil actualizados. Serás redirigido...");
      console.log("SetInitialPasswordPage: Flag actualizado. Llamando a onPasswordAndFlagUpdated.");
      if (onPasswordAndFlagUpdated) {
        onPasswordAndFlagUpdated(); // Notificar a App.js para que refresque el perfil y maneje la navegación
      } else {
        console.error("SetInitialPasswordPage: ¡onPasswordAndFlagUpdated no fue proporcionado como prop! La redirección automática podría fallar.");
        // Fallback: Informar al usuario que refresque si la redirección automática no ocurre (lo cual no debería pasar si App.js está bien)
        toast.info("Si no eres redirigido, por favor refresca la página.");
      }
    } else {
      // Esto es un caso problemático: la contraseña en Auth cambió, pero tu flag en 'profiles' no.
      // El usuario podría quedar en un estado inconsistente.
      toast.error("Contraseña actualizada, pero hubo un error al actualizar el estado de tu perfil. Por favor, contacta a soporte o intenta refrescar.");
      console.error("SetInitialPasswordPage: Contraseña actualizada en Auth, pero updateUserPasswordChangeFlag falló.");
    }
  };

  const pageStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: colors.bgMain,
    color: colors.textPrimary,
    padding: '20px',
  };

  const formStyle = {
    padding: '30px',
    backgroundColor: colors.bgSec,
    borderRadius: '8px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '450px',
  };

  return (
    <div style={pageStyle}>
      <div style={formStyle}>
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Establecer Nueva Contraseña</h2>
        <p style={{ textAlign: 'center', marginBottom: '25px', fontSize: '0.9em', color: colors.textSec }}>
          Por tu seguridad, es necesario que cambies la contraseña predeterminada que te fue asignada.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="newPassword" style={{ display: 'block', marginBottom: '5px' }}>Nueva Contraseña:</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={commonInputStyle}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="confirmNewPassword" style={{ display: 'block', marginBottom: '5px' }}>Confirmar Nueva Contraseña:</label>
            <input
              type="password"
              id="confirmNewPassword"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              style={commonInputStyle}
            />
          </div>
          <button type="submit" disabled={loading} style={commonButtonStyle}>
            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SetInitialPasswordPage;