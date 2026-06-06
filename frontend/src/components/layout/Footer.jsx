import { Brain } from 'lucide-react'

const Footer = () => {
  return (
    <footer style={{borderTop:'1px solid #1e293b',background:'#080D1A'}}>
      <div style={{maxWidth:'1152px',margin:'0 auto',padding:'4rem 1.5rem'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'3rem'}}>

          <div>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'1rem'}}>
              <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'linear-gradient(135deg,#7C3AED,#06B6D4)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Brain size={16} color="white" />
              </div>
              <span style={{color:'white',fontWeight:'600',fontSize:'18px'}}>
                Mentora <span style={{color:'#22D3EE'}}>AI</span>
              </span>
            </div>
            <p style={{color:'#64748b',fontSize:'14px',lineHeight:'1.6',marginBottom:'1.5rem'}}>
              Learn by teaching, not by re-reading.
            </p>
            <div style={{display:'flex',gap:'12px'}}>
              {['T','G','L'].map((letter) => (
                <a key={letter} href="#" style={{width:'36px',height:'36px',borderRadius:'8px',border:'1px solid #334155',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b',textDecoration:'none',fontSize:'13px',fontWeight:'600'}}>
                  {letter}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{color:'white',fontWeight:'600',fontSize:'14px',marginBottom:'1rem'}}>Product</h4>
            {['Features','Docs','Changelog'].map((item) => (
              <div key={item} style={{marginBottom:'12px'}}>
                <a href="#" style={{color:'#64748b',fontSize:'14px',textDecoration:'none'}}>{item}</a>
              </div>
            ))}
          </div>

          <div>
            <h4 style={{color:'white',fontWeight:'600',fontSize:'14px',marginBottom:'1rem'}}>Company</h4>
            {['Blog','About','Careers','Contact'].map((item) => (
              <div key={item} style={{marginBottom:'12px'}}>
                <a href="#" style={{color:'#64748b',fontSize:'14px',textDecoration:'none'}}>{item}</a>
              </div>
            ))}
          </div>

          <div>
            <h4 style={{color:'white',fontWeight:'600',fontSize:'14px',marginBottom:'1rem'}}>Legal</h4>
            {['Privacy','Terms','Security','Cookies'].map((item) => (
              <div key={item} style={{marginBottom:'12px'}}>
                <a href="#" style={{color:'#64748b',fontSize:'14px',textDecoration:'none'}}>{item}</a>
              </div>
            ))}
          </div>

        </div>

        <div style={{marginTop:'3rem',paddingTop:'2rem',borderTop:'1px solid #1e293b',display:'flex',justifyContent:'space-between'}}>
          <p style={{color:'#475569',fontSize:'14px'}}>2026 Mentora AI. All rights reserved.</p>
          <p style={{color:'#475569',fontSize:'14px'}}>Built for the curious.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer