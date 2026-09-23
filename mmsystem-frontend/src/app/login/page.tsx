'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import api from '@/services/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const res = await api.post('/auth/login', { email, senha });
      if (res.data.token) {
        localStorage.setItem('mm_token', res.data.token);
        localStorage.setItem('mm_user', res.data.usuario);
        if (res.data.perfil) {
          localStorage.setItem('mm_perfil', res.data.perfil);
        }

        // Redireciona limpando a rota interna (admin) da URL
        window.location.href = '/';
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { mensagem?: string } | string | undefined;
        const mensagem = typeof data === 'string' ? data : data?.mensagem;
        setErro(mensagem || 'Falha ao realizar login. Verifique suas credenciais.');
      } else {
        setErro('Ocorreu um erro inesperado ao conectar com o servidor.');
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#dcded0] flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full border-t-8 border-[#2d3a22]">
        <div className="text-center mb-6">
          <h1 className="font-serif text-2xl font-bold text-[#2d3a22]">MARIA MORENA</h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Painel Administrativo</p>
        </div>

        {erro && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-600 p-3 text-xs text-red-800 font-semibold rounded-sm">
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-600 font-bold uppercase mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail aqui"
              className="w-full p-3 border border-gray-300 rounded bg-gray-50 outline-none focus:border-[#2d3a22]"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-bold uppercase mb-1">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 border border-gray-300 rounded bg-gray-50 outline-none focus:border-[#2d3a22]"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-[#2d3a22] hover:bg-[#3d5427] text-white font-bold py-3 uppercase tracking-wider rounded transition cursor-pointer disabled:opacity-50 mt-2"
          >
            {carregando ? 'Entrando...' : 'Acessar Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}