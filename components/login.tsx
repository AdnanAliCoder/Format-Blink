'use client';
import {useState} from 'react';
import {Icon} from './brand';

export default function Login({
  signup=false,
  title,
  description,
}:{signup?:boolean;title?:string;description?:string}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [name,setName]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [show,setShow]=useState(false);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setBusy(true);
    setError('');
    try{
      const r=await fetch('/api/manage',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:signup?'signup':'login',email,password,name}),
      });
      const d:any=await r.json();
      if(!r.ok)throw new Error(d.error);
      location.href=d.user.role==='admin'?'/admin':'/account';
    }catch(e){
      setError(e instanceof Error?e.message:(signup?'Unable to create your account. Please try again.':'Unable to sign in. Please try again.'));
    }finally{
      setBusy(false);
    }
  }

  const headingTop=signup?'Create your':'Welcome to your';
  const headingAccent='file toolbox.';
  const intro=signup
    ?'Create one account for a cleaner, more connected Format Blink workspace.'
    :'Everything you need to work with your files, together in Format Blink.';

  return <div className={'auth-layout auth-showcase '+(signup?'auth-signup':'auth-login')}>
    <section className="auth-intro" aria-label={signup?'Create a Format Blink account':'Sign in to Format Blink'}>
      <span className="auth-badge"><Icon name="devices" size={16}/> ONE ACCOUNT. ONE WORKSPACE.</span>
      <h1>{headingTop}<br/><span>{headingAccent}</span></h1>
      <p>{intro}</p>

      <div className="auth-visual" aria-hidden="true">
        <div className="auth-orbit orbit-one"/>
        <div className="auth-orbit orbit-two"/>
        <div className="auth-logo-core"><img src="/brand-icon.webp" alt=""/></div>
        <span className="auth-float auth-float-file"><Icon name="file" size={28}/></span>
        <span className="auth-float auth-float-image"><Icon name="image" size={28}/></span>
        <span className="auth-float auth-float-video"><Icon name="video" size={28}/></span>
        <span className="auth-float auth-float-clip"><Icon name="scissors" size={28}/></span>
        <span className="auth-dot dot-a"/>
        <span className="auth-dot dot-b"/>
        <span className="auth-dot dot-c"/>
      </div>

      <div className="auth-categories">
        {[
          ['file','PDF','file'],
          ['image','Image','image'],
          ['video','Video','video'],
          ['scissors','Clips','clip'],
        ].map(([icon,label,key])=><div className={key} key={label}>
          <span className="tool-icon"><Icon name={icon} size={24}/></span>
          <span>{label}</span>
        </div>)}
      </div>

      <div className="auth-note">
        <Icon name="shield" size={21}/>
        <p>You can use browser conversion tools without an account.<br/>Your files stay on your device.</p>
      </div>
    </section>

    <section className="auth-card">
      <div className="auth-card-glow" aria-hidden="true"/>
      <span className="section-kicker">FORMAT BLINK ACCOUNT</span>
      <h2>{title||(signup?'Create your account':'Welcome back')}</h2>
      <p>{description||(signup?'Set up your workspace in a few seconds.':'Sign in to your workspace.')}</p>

      <form onSubmit={submit}>
        {signup&&<label className="field">
          <span>Your name</span>
          <span className="auth-input">
            <Icon name="file" size={18}/>
            <input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"/>
          </span>
        </label>}

        <label className="field">
          <span>Email address</span>
          <span className="auth-input">
            <Icon name="mail" size={18}/>
            <input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
          </span>
        </label>

        <label className="field">
          <span>Password</span>
          <span className="auth-input password-field">
            <Icon name="lock" size={18}/>
            <input required minLength={8} type={show?'text':'password'} autoComplete={signup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/>
            <button type="button" onClick={()=>setShow(!show)} aria-label={show?'Hide password':'Show password'}>{show?'Hide':'Show'}</button>
          </span>
        </label>

        {signup&&<label className="terms-check">
          <input type="checkbox" required/>
          <span>I agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy policy</a>.</span>
        </label>}

        {error&&<p role="alert" className="error-message">{error}</p>}

        <button className="btn primary full auth-submit" disabled={busy}>
          <span>{busy?'Please wait…':signup?'Create account':'Log in'}</span>
          {!busy&&<Icon name="chevron" size={18}/>}
        </button>
      </form>

      <p className="auth-switch">
        {signup?'Already have an account?':'New to Format Blink?'}{' '}
        <a href={signup?'/login':'/signup'}>{signup?'Log in':'Create account'}</a>
      </p>

      {!signup&&<div className="demo-box">
        <div className="demo-title"><span><Icon name="devices" size={19}/></span><div><strong>Explore the admin demo</strong><p>A shared demo account for reviewing the website controls.</p></div></div>
        <button className="btn secondary full" onClick={()=>{setEmail('admin@formatblink.demo');setPassword('BlinkDemo!2026')}}>Use demo account</button>
        <small>admin@formatblink.demo · BlinkDemo!2026</small>
      </div>}
    </section>
  </div>;
}
