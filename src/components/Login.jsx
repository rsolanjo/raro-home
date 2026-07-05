import { useState, useEffect } from 'react'
import { LOGO_COVER } from '../logos.js'
import { signInEmailSenha, signInGoogle, resolveSessao, criarAcessoComSenha } from '../db/supabase.js'

export default function Login({ onLogin }) {
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [checando, setChecando] = useState(true)  // checando sessão existente (ex: volta do Google)
  const [modo, setModo] = useState('entrar')       // 'entrar' | 'criar' (primeiro acesso)

  async function criarSenha(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await criarAcessoComSenha(email, senha)
      // após criar, já tenta entrar (confere a lista de admins)
      const admin = await signInEmailSenha(email, senha)
      onLogin(admin)
    } catch (err) {
      setError(err.message || 'Não foi possível criar o acesso.')
    } finally {
      setLoading(false)
    }
  }

  // Ao montar: se já voltou autenticado do Google, resolve e entra.
  useEffect(() => {
    (async () => {
      try {
        const admin = await resolveSessao()
        if (admin) { onLogin(admin); return }
      } catch (e) { /* segue para tela de login */ }
      setChecando(false)
    })()
  }, [])

  async function entrarComSenha(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const admin = await signInEmailSenha(email, senha)
      onLogin(admin)
    } catch (err) {
      setError(err.message || 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  async function entrarComGoogle() {
    setError('')
    try {
      await signInGoogle()  // redireciona; volta e cai no resolveSessao acima
    } catch (err) {
      setError('Não foi possível iniciar o login com Google.')
    }
  }

  if (checando) {
    return (
      <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #1A1915 0%, #2B2420 50%, #1A1915 100%)' }}>
        <div style={{ color:'#C9A268', fontSize:13, letterSpacing:1 }}>
          <i className="ti ti-loader" style={{ animation:'spin 1s linear infinite', marginRight:8 }} aria-hidden />
          Verificando acesso...
        </div>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    )
  }

  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #1A1915 0%, #2B2420 50%, #1A1915 100%)' }}>
      <div style={{ width:380, background:'#F7F6F3', borderRadius:16, padding:'40px 36px 36px', boxShadow:'0 24px 64px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img src={LOGO_COVER} alt="RARO Home" style={{ height:100, width:'auto', display:'block', margin:'0 auto 12px' }} />
          <div style={{ fontSize:10, letterSpacing:3, color:'#1A56DB', textTransform:'uppercase', fontWeight:500 }}>
            Sistema de Gestão
          </div>
        </div>
        <div style={{ height:1, background:'#E3E2DE', marginBottom:24 }} />

        {/* Entrar com Google */}
        <button
          type="button"
          onClick={entrarComGoogle}
          style={{
            width:'100%', padding:11, background:'#fff', border:'1px solid #D3D2CC',
            borderRadius:8, color:'#1A1915', fontSize:13, fontWeight:500, cursor:'pointer',
            fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:18
          }}
        >
          <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.5 26.9 35.5 24 35.5c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.6 5.6C41.9 35.9 44 30.4 44 24c0-1.3-.1-2.3-.4-3.5z"/>
          </svg>
          Entrar com Google
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:10, margin:'0 0 18px', color:'#9B9A95', fontSize:11 }}>
          <div style={{ flex:1, height:1, background:'#E3E2DE' }} />ou<div style={{ flex:1, height:1, background:'#E3E2DE' }} />
        </div>

        {/* Entrar / criar senha com e-mail */}
        <form onSubmit={modo==='criar' ? criarSenha : entrarComSenha}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10.5, fontWeight:500, color:'#6B6A65', letterSpacing:0.5, textTransform:'uppercase', marginBottom:6 }}>E-mail</div>
            <input
              type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="seuemail@empresa.com" autoFocus autoComplete="username"
              style={{ width:'100%', padding:'10px 12px', fontSize:13, border:`1px solid ${error?'#B42318':'#D3D2CC'}`, borderRadius:8, background:'#fff', color:'#1A1915', outline:'none', fontFamily:'inherit' }}
            />
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10.5, fontWeight:500, color:'#6B6A65', letterSpacing:0.5, textTransform:'uppercase', marginBottom:6 }}>{modo==='criar'?'Crie uma senha':'Senha'}</div>
            <input
              type="password" value={senha} onChange={e => { setSenha(e.target.value); setError('') }}
              placeholder={modo==='criar'?'mínimo 6 caracteres':'••••••••'} autoComplete={modo==='criar'?'new-password':'current-password'}
              style={{ width:'100%', padding:'10px 12px', fontSize:13, border:`1px solid ${error?'#B42318':'#D3D2CC'}`, borderRadius:8, background:'#fff', color:'#1A1915', outline:'none', fontFamily:'inherit' }}
            />
          </div>
          {error && (
            <div style={{ background:'#FEE4E2', border:'1px solid #B42318', borderRadius:6, padding:'8px 12px', fontSize:12, color:'#B42318', marginBottom:14 }}>
              <i className="ti ti-alert-circle" style={{ marginRight:5 }} aria-hidden />{error}
            </div>
          )}
          <button
            type="submit" disabled={loading || !email || !senha}
            style={{ width:'100%', padding:11, background:(loading||!email||!senha)?'#9CA3AF':'#1A56DB', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:500, cursor:(loading||!email||!senha)?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
          >
            {loading
              ? <><i className="ti ti-loader" style={{ animation:'spin 1s linear infinite' }} aria-hidden />{modo==='criar'?'Criando...':'Verificando...'}</>
              : <><i className="ti ti-login" aria-hidden />{modo==='criar'?'Criar acesso e entrar':'Entrar no sistema'}</>}
          </button>
        </form>

        <div style={{ marginTop:14, textAlign:'center', fontSize:11.5 }}>
          {modo==='entrar'
            ? <span style={{color:'#6B6A65'}}>Primeiro acesso? <a onClick={()=>{setModo('criar');setError('')}} style={{color:'#1A56DB',cursor:'pointer',fontWeight:500}}>Criar minha senha</a></span>
            : <span style={{color:'#6B6A65'}}>Já tem senha? <a onClick={()=>{setModo('entrar');setError('')}} style={{color:'#1A56DB',cursor:'pointer',fontWeight:500}}>Entrar</a></span>}
        </div>

        <div style={{ marginTop:20, fontSize:11, color:'#9B9A95', textAlign:'center', lineHeight:1.6 }}>
          Acesso restrito à equipe RARO Home.<br />Contato: contato@rarohome.com.br
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
