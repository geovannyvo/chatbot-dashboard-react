// src/UpdatePasswordPage.js
import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Reutilizando los mismos estilos para consistencia visual
const colors = { textPrimary: 'var(--wa-dark-text-primary, #e9edef)', textSec: 'var(--wa-dark-text-sec, #8696a0)', bgMain: 'var(--wa-dark-bg-main, #111b21)', bgSec: 'var(--wa-dark-bg-sec, #202c33)', border: 'var(--wa-dark-border, #374045)', accent: 'var(--wa-dark-accent, #00a884)', alert: 'var(--wa-dark-alert, #f44336)'};
const commonInputStyle = { width: '100%', padding: '12px', marginBottom: '15px', border: `1px solid ${colors.border}`, borderRadius: '4px', backgroundColor: colors.bgSec, color: colors.textPrimary, boxSizing: 'border-box' };
const commonButtonStyle = { width: '100%', padding: '12px', border: 'none', borderRadius: '20px', backgroundColor: colors.accent, color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'filter 0.2s ease', marginTop: '10px' };
const pageStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: colors.bgMain, color: colors.textPrimary, padding: '20px' };
const formStyle = { padding: '30px', backgroundColor: colors.bgSec, borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', width: '100%', maxWidth: '400px' };

function UpdatePasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Las contraseñas no coinciden.");
            return;
        }

        if (password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        
        setLoading(true);

        // Cuando el usuario llega a esta página desde el enlace del email,
        // Supabase ya ha establecido una sesión de recuperación.
        // Solo necesitamos llamar a updateUser para establecer la nueva contraseña.
        const { error } = await supabase.auth.updateUser({ password: password });

        setLoading(false);

        if (error) {
            console.error("[UpdatePasswordPage] Error al actualizar la contraseña:", error);
            toast.error(error.message || "No se pudo actualizar la contraseña.");
        } else {
            toast.success("¡Contraseña actualizada con éxito! Por favor, inicia sesión.");
            // Después de actualizar, cerramos la sesión para forzar un login limpio
            // y redirigimos al usuario a la página de login.
            await supabase.auth.signOut();
            navigate('/login');
        }
    };

    return (
        <div style={pageStyle}>
            <div style={formStyle}>
                <h2 style={{ textAlign: 'center', marginBottom: '25px', color: colors.textPrimary }}>Establecer Nueva Contraseña</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="password" style={{ display: 'block', marginBottom: '5px', color: colors.textSec }}>Nueva Contraseña:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={commonInputStyle}
                            placeholder="••••••••"
                        />
                    </div>
                     <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '5px', color: colors.textSec }}>Confirmar Contraseña:</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            style={commonInputStyle}
                            placeholder="••••••••"
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

export default UpdatePasswordPage;

