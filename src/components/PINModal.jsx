import { useState } from 'react'
import { verifyPIN, setPINSession } from '../db/supabase.js'

export default function PINModal({ onSuccess, onCancel, message }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (verifyPIN(pin)) {
      setPINSession()
      onSuccess()
    } else {
      setError('PIN incorreto')
      setPin('')
    }
  }

  return (
    <div className="modal-overlay" style={{zIndex:200}}>
      <div className="modal" style={{width:320}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{display:'flex',alignItems:'center',gap:8}}>
            <i className="ti ti-lock" style={{color:'var(--accent)'}} aria-hidden/>
            Confirmar PIN
          </div>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        {message && <div style={{fontSize:12,color:'var(--text2)',marginBottom:14,lineHeight:1.5}}>{message}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={e=>{setPin(e.target.value);setError('')}}
            placeholder="Digite o PIN..."
            autoFocus
            style={{textAlign:'center',fontSize:20,letterSpacing:8,marginBottom:8}}
            maxLength={6}
          />
          {error && <div style={{fontSize:12,color:'var(--red)',marginBottom:8,textAlign:'center'}}>{error}</div>}
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button type="button" className="btn" style={{flex:1}} onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn primary" style={{flex:1}} disabled={!pin}>Confirmar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
