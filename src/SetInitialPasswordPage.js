// chatbot-dashboard-react/src/SetInitialPasswordPage.js
import React, { useState } from 'react';
// Asegúrate que la ruta a supabaseClient sea correcta. Si ambos están en src/, es './supabaseClient'
import { supabase, updateUserPasswordChangeFlag } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

// Puedes definir tus colores aquí o importarlos si los tienes en un archivo global de estilos/variables
const colors = {
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
  boxSizing: 'border-box',
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

function SetInitialPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    console.log("SetInitialPasswordPage: handleSubmit iniciado.");

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      console.log("SetInitialPasswordPage: Error - Contraseña corta.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Las nuevas contraseñas no coinciden.");
      console.log("SetInitialPasswordPage: Error - Contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    console.log("SetInitialPasswordPage: setLoading(true)");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        setError("Error de autenticación. No se pudo obtener el usuario actual. Intenta iniciar sesión de nuevo.");
        console.error("SetInitialPasswordPage: Error obteniendo usuario actual o no hay usuario:", userError);
        setLoading(false);
        return;
    }
    console.log("SetInitialPasswordPage: Usuario actual obtenido:", user.id);

    console.log("SetInitialPasswordPage: Intentando actualizar contraseña en Supabase Auth...");
    const { data: updateUserData, error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      setError(`Error al actualizar la contraseña en Auth: ${updateError.message}`);
      console.error("SetInitialPasswordPage: Error en supabase.auth.updateUser:", updateError);
      setLoading(false);
      return;
    }
    console.log("SetInitialPasswordPage: Contraseña actualizada en Supabase Auth exitosamente.", updateUserData);

    console.log("SetInitialPasswordPage: Intentando actualizar flag needs_password_change a false para el usuario:", user.id);
    const flagUpdated = await updateUserPasswordChangeFlag(user.id, false);
    console.log("SetInitialPasswordPage: Resultado de updateUserPasswordChangeFlag:", flagUpdated);

    if (flagUpdated) {
      setMessage("Contraseña actualizada exitosamente. Serás redirigido al dashboard.");
      console.log("SetInitialPasswordPage: Flag actualizado. Redirigiendo a '/'...");
      setTimeout(() => {
        navigate('/');
      }, 2500);
    } else {
      setError("Tu contraseña ha sido actualizada en el sistema de autenticación, pero ocurrió un error al actualizar el estado de tu perfil para reflejar este cambio. Por favor, intenta iniciar sesión de nuevo. Si el problema persiste, contacta a soporte.");
      console.error("SetInitialPasswordPage: Contraseña actualizada en Auth, pero updateUserPasswordChangeFlag falló.");
    }
    setLoading(false);
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

  // ESTE ES EL JSX CORRECTO QUE DEBE ESTAR EN EL RETURN
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
          {error && <p style={{ color: colors.alert, marginTop: '15px', textAlign: 'center', fontSize: '0.9em' }}>{error}</p>}
          {message && <p style={{ color: colors.accent, marginTop: '15px', textAlign: 'center', fontSize: '0.9em' }}>{message}</p>}
        </form>
      </div>
    </div>
  );
}

export default SetInitialPasswordPage;