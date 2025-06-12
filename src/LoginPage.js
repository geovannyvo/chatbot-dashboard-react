// src/LoginPage.js
import React, { useState } from 'react';
import { supabase } from './supabaseClient'; // Asegúrate que la ruta sea correcta
import { Link } from 'react-router-dom'; // Importar Link para "Olvidé mi contraseña"
import { toast } from 'react-toastify';

// Define o importa tus variables de estilo
const colors = {
    textPrimary: 'var(--wa-dark-text-primary, #e9edef)',
    textSec: 'var(--wa-dark-text-sec, #8696a0)',
    bgMain: 'var(--wa-dark-bg-main, #111b21)',
    bgSec: 'var(--wa-dark-bg-sec, #202c33)',
    border: 'var(--wa-dark-border, #374045)',
    accent: 'var(--wa-dark-accent, #00a884)',
    alert: 'var(--wa-dark-alert, #f44336)'
};

const commonInputStyle = {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    backgroundColor: colors.bgSec, // O colors.bgMain si prefieres que el input sea más oscuro
    color: colors.textPrimary,
    boxSizing: 'border-box' // Es bueno tenerlo, aunque ya debería ser global
};

const commonButtonStyle = {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '20px', // Redondeado como los botones de WhatsApp
    backgroundColor: colors.accent,
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'filter 0.2s ease',
    marginTop: '10px', // Espacio después del último input
};

// Estilos para la página y el formulario (puedes moverlos a App.css si prefieres)
const pageStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: colors.bgMain,
    color: colors.textPrimary,
    padding: '20px', // Añade padding general a la página
};

const formStyle = {
    padding: '30px',
    backgroundColor: colors.bgSec,
    borderRadius: '8px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '400px', // Limita el ancho del formulario
};


function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // `useNavigate` no es necesario aquí si App.js maneja la redirección post-login

    const handleLogin = async (event) => {
        event.preventDefault();
        setLoading(true);
        console.log("[LoginPage] Iniciando login para:", email);
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (signInError) {
            console.error("[LoginPage] Error en signInWithPassword:", signInError);
            toast.error(signInError.message || "Error al iniciar sesión. Verifica tus credenciales.");
        } else {
            console.log("[LoginPage] Login inicial exitoso. App.js debería detectar el cambio de sesión y manejar la redirección.");
            // No se necesita navegar aquí, App.js lo hará al detectar el cambio en `session` y `userProfile`.
        }
        setLoading(false);
    };
    
    return (
        <div style={pageStyle}>
            <div style={formStyle}>
                <h2 style={{ textAlign: 'center', marginBottom: '25px', color: colors.textPrimary }}>Iniciar Sesión de Agente</h2>
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', color: colors.textSec }}>Email:</label>
                        <input 
                            id="email" 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            style={commonInputStyle}
                            placeholder="tu@email.com"
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="password" style={{ display: 'block', marginBottom: '5px', color: colors.textSec }}>Contraseña:</label>
                        <input 
                            id="password" 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            style={commonInputStyle}
                            placeholder="Tu contraseña"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        style={commonButtonStyle}
                        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                    >
                        {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                    </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <Link to="/forgot-password" style={{ color: colors.accent, textDecoration: 'none', fontSize: '0.9em' }}>
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>
            </div> {/* Cierre del div con formStyle */}
        </div> 
    );
}

export default LoginPage;