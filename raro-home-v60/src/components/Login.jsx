import { useState } from 'react'
import { LOGO_COVER } from '../logos.js'
import { getAdmins } from '../db/supabase.js'

export default function Login({ onLogin }) {
  const [gmail, setGmail]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const admins = await getAdmins()
      const user = admins.find(a => a.gmail.toLowerCase() === gmail.toLowerCase().trim())
      if (user) {
        localStorage.setItem('raro_session', JSON.stringify({
          gmail: user.gmail, name: user.name, role: user.role, at: Date.now()
        }))
        onLogin(user)
      } else {
        setError('Acesso não autorizado. Este e-mail não tem permissão.')
      }
    } catch (err) {
      setError('Erro de conexão com o servidor. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
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
        <div style={{ height:1, background:'#E3E2DE', marginBottom:28 }} />
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10.5, fontWeight:500, color:'#6B6A65', letterSpacing:0.5, textTransform:'uppercase', marginBottom:6 }}>
              Gmail cadastrado
            </div>
            <input
              type="email"
              value={gmail}
              onChange={e => { setGmail(e.target.value); setError('') }}
              placeholder="seugmail@gmail.com"
              autoFocus
              style={{
                width:'100%', padding:'10px 12px', fontSize:13,
                border:`1px solid ${error ? '#B42318' : '#D3D2CC'}`,
                borderRadius:8, background:'#fff', color:'#1A1915',
                outline:'none', fontFamily:'inherit',
                boxShadow: error ? '0 0 0 3px #FEE4E2' : 'none',
              }}
            />
          </div>
          {error && (
            <div style={{ background:'#FEE4E2', border:'1px solid #B42318', borderRadius:6, padding:'8px 12px', fontSize:12, color:'#B42318', marginBottom:14 }}>
              <i className="ti ti-alert-circle" style={{ marginRight:5 }} aria-hidden />
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !gmail}
            style={{
              width:'100%', padding:11,
              background: loading || !gmail ? '#9CA3AF' : '#1A56DB',
              border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:500,
              cursor: loading || !gmail ? 'not-allowed' : 'pointer',
              fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              transition:'background 0.15s',
            }}
          >
            {loading
              ? <><i className="ti ti-loader" style={{ animation:'spin 1s linear infinite' }} aria-hidden />Verificando...</>
              : <><i className="ti ti-login" aria-hidden />Entrar no sistema</>
            }
          </button>
        </form>
        <div style={{ marginTop:20, fontSize:11, color:'#9B9A95', textAlign:'center', lineHeight:1.6 }}>
          Acesso restrito à equipe RARO Home.<br />
          Contato: contato@rarohome.com.br
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
