// src/ForgotPasswordPage.js
// (Asegúrate que la ruta a supabaseClient sea correcta si está en una subcarpeta)
import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

// Reutiliza tus variables de color y estilos comunes si es necesario
const colors = { /* ... tus variables de color ... */ };
const commonInputStyle = { /* ... tus estilos ... */ };
const commonButtonStyle = { /* ... tus estilos ... */ };
// Por ejemplo:
// const colors = { textPrimary: 'var(--wa-dark-text-primary, #e9edef)', textSec: 'var(--wa-dark-text-sec, #8696a0)', bgMain: 'var(--wa-dark-bg-main, #111b21)', bgSec: 'var(--wa-dark-bg-sec, #202c33)', border: 'var(--wa-dark-border, #374045)', accent: 'var(--wa-dark-accent, #00a884)', alert: 'var(--wa-dark-alert, #f44336)'};
// const commonInputStyle = { width: '100%', padding: '12px', marginBottom: '15px', border: `1px solid ${colors.border}`, borderRadius: '4px', backgroundColor: colors.bgSec, color: colors.textPrimary, boxSizing: 'border-box' };
// const commonButtonStyle = { width: '100%', padding: '12px', border: 'none', borderRadius: '20px', backgroundColor: colors.accent, color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'filter 0.2s ease', marginTop: '10px' };


function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        console.log("[ForgotPasswordPage] Solicitando reseteo para:", email);

        // IMPORTANTE: Ajusta la URL de 'redirectTo' a donde tendrás tu página de actualización de contraseña.
        // Para desarrollo puede ser localhost, para producción será tu dominio.
        const redirectTo = 'http://localhost:3000/update-password';
        // Alternativamente, si tienes una variable de entorno para la URL base de tu app:
        // const redirectTo = `${process.env.REACT_APP_BASE_URL}/update-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectTo,
        });

        setLoading(false);
        if (error) {
            console.error("[ForgotPasswordPage] Error en resetPasswordForEmail:", error);
            toast.error(error.message || "Error al solicitar el reseteo de contraseña.");
        } else {
            toast.success("Si tu correo está registrado, recibirás un enlace para recuperar tu contraseña.");
            console.log("[ForgotPasswordPage] Solicitud de reseteo enviada para:", email, "Redirigiendo a:", redirectTo);
        }
    };
    
    const pageStyle = { /* ... tu pageStyle (similar a LoginPage) ... */ };
    const formStyle = { /* ... tu formStyle (similar a LoginPage) ... */ };
    // Por ejemplo:
    // const pageStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: colors.bgMain, color: colors.textPrimary, padding: '20px' };
    // const formStyle = { padding: '30px', backgroundColor: colors.bgSec, borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', width: '100%', maxWidth: '400px' };

    return (
        <div style={pageStyle}>
            <div style={formStyle}>
                <h2 style={{ textAlign: 'center', marginBottom: '25px', color: colors.textPrimary }}>Recuperar Contraseña</h2>
                <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '0.9em', color: colors.textSec }}>
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', color: colors.textSec }}>Email:</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={commonInputStyle}
                            placeholder="tu@email.com"
                        />
                    </div>
                    <button type="submit" disabled={loading} style={commonButtonStyle}>
                        {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                    </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: '25px' }}>
                    <Link to="/login" style={{ color: colors.accent, textDecoration: 'none', fontSize: '0.9em' }}>
                        Volver a Iniciar Sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ForgotPasswordPage;