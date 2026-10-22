'use client';

import React, { useState, FormEvent } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import api from '@/services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
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
        window.location.href = '/inicio';
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
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-linear-to-br from-brand-800 via-brand-900 to-brand-950 text-white p-14">
        <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 w-[26rem] h-[26rem] rounded-full bg-clay-400/15 blur-3xl" />

        <Image src="/escritocompleto1linha.svg" alt="Maria Morena" width={805} height={123} className="relative w-64 h-auto" priority />

        <div className="relative max-w-md">
          <p className="text-xs font-semibold tracking-widest uppercase text-clay-200 mb-4">Painel administrativo</p>
          <h2 className="font-display text-4xl xl:text-5xl font-medium leading-[1.1] tracking-tight">
            A moda ao seu alcance, com a gestão em suas mãos.
          </h2>
          <p className="mt-5 text-brand-100/80 leading-relaxed">
            Produtos, pedidos, condicionais e pagamentos da Maria Morena em um só lugar, de forma simples e leve.
          </p>
        </div>

        <p className="relative text-xs text-brand-200/60">© {new Date().getFullYear()} Maria Morena · MM System</p>
      </aside>

      {/* Formulário */}
      <main className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md animate-subir">
          <div className="lg:hidden flex justify-center mb-8">
            <span className="bg-brand-900 rounded-2xl px-6 py-4 shadow-lg">
              <Image src="/escritocompleto1linha.svg" alt="Maria Morena" width={805} height={123} className="w-44 h-auto" priority />
            </span>
          </div>

          <div className="mm-card p-7 sm:p-10 shadow-lg">
            <h1 className="text-3xl font-semibold text-brand-900 tracking-tight">Bem-vinda de volta</h1>
            <p className="text-sm text-gray-600 mt-1.5 mb-7">Entre com seu e-mail e senha para acessar o painel.</p>

            {erro && (
              <div role="alert" className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 p-3.5 text-sm text-red-800 rounded-xl">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="mm-label">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    className="mm-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="senha" className="mm-label">Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Sua senha"
                    className="mm-input pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={carregando} className="mm-btn-primary w-full h-12 text-base mt-2">
                {carregando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Entrando...
                  </>
                ) : (
                  <>
                    Acessar painel <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">Acesso restrito à equipe Maria Morena.</p>
        </div>
      </main>
    </div>
  );
}
