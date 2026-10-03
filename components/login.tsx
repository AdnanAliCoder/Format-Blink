'use client';
import {useMemo,useState} from 'react';
import {Icon} from './brand';

export default function Login({
  signup=false,
  title,
  description,
  visualImage='/image-tools-hero.webp',
}:{signup?:boolean;title?:string;description?:string;visualImage?:string}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [name,setName]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [show,setShow]=useState(false);

  const strength=useMemo(()=>{
    let score=0;
    if(password.length>=6)score++;
    if(password.length>=10)score++;
    if(/[A-Z]/.test(password)&&/[a-z]/.test(password))score++;
    if(/\d/.test(password)&&/[^A-Za-z0-9]/.test(password))score++;
    return score;
  },[password]);

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

  const shortcuts=[
    ['file','PDF','file','/pdf'],
    ['image','Image','image','/image'],
    ['video','Video','video','/video'],
    ['scissors','Clips','clip','/clips'],
  ];

  return <div className={'auth-page '+(signup?'auth-signup':'auth-login')}>
    <section className="auth-top" aria-label={signup?'Create a Format Blink account':'Sign in to Format Blink'}>
      <div>
        <span className="eyebrow"><Icon name="check" size={12}/>{signup?'Start free. Upgrade anytime.':'One account. One workspace.'}</span>
        <h1 className="auth-title">{signup?'Create your ':'Welcome to your '}<span className="accent">{signup?'Format Blink':'file toolbox.'}</span></h1>
      </div>
      <p className="auth-desc">{signup?'One account for every file tool. Sign up once and use it across all your devices.':'Everything you need to work with your files, together in Format Blink.'}</p>
    </section>

    <div className="auth-lower">
      <aside className="auth-visual-side">
        <div className="auth-illu" aria-hidden="true">
          <svg className="auth-links" viewBox="0 0 430 300" preserveAspectRatio="none">
            <path d="M215 150 L48 42"/><path d="M215 150 L382 45"/><path d="M215 150 L46 255"/><path d="M215 150 L382 250"/>
            <circle cx="48" cy="42" r="3"/><circle cx="382" cy="45" r="3"/><circle cx="46" cy="255" r="3"/><circle cx="382" cy="250" r="3"/>
          </svg>
          <div className="stack">{visualImage?<img src={visualImage} alt=""/>:<Icon name="layers" size={70}/>}</div>
          <span className="fl f1"><Icon name="file" size={26}/></span>
          <span className="fl f2"><Icon name="image" size={26}/></span>
          <span className="fl f3"><Icon name="video" size={26}/></span>
          <span className="fl f4"><Icon name="scissors" size={26}/></span>
        </div>

        <div className="shortcut-cards">
          {shortcuts.map(([icon,label,key,href])=><a href={href} className={'sc-card '+key} key={label}>
            <span className="sc-icon"><Icon name={icon} size={18}/></span>
            <span>{label}</span>
          </a>)}
        </div>

        <div className="security-note">
          <Icon name="shield" size={18}/>
          <span>{signup?'Your files stay on your device. We never upload them without your permission.':'You can still use browser conversion tools without an account. Files stay on your device.'}</span>
        </div>
      </aside>

      <section className="auth-card">
        <span className="eyebrow"><Icon name="check" size={12}/>{signup?'Create account':'Format Blink account'}</span>
        <h2>{title||(signup?'Get started for free':'Welcome back')}</h2>
        <p className="sub">{description||(signup?'No credit card required.':'Sign in to your workspace.')}</p>

        <form onSubmit={submit}>
          {signup&&<div className="field">
            <label htmlFor="signup-name">Full name</label>
            <div className="field-wrap">
              <Icon name="devices" size={16}/>
              <input id="signup-name" required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/>
            </div>
          </div>}

          <div className="field">
            <label htmlFor={signup?'signup-email':'login-email'}>Email address</label>
            <div className="field-wrap">
              <Icon name="mail" size={16}/>
              <input id={signup?'signup-email':'login-email'} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
            </div>
          </div>

          <div className="field">
            <label htmlFor={signup?'signup-password':'login-password'}>Password</label>
            <div className="field-wrap">
              <Icon name="lock" size={16}/>
              <input id={signup?'signup-password':'login-password'} required minLength={8} type={show?'text':'password'} autoComplete={signup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={signup?'Create a strong password':'At least 8 characters'}/>
              <button type="button" className="show" onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button>
            </div>
            {signup&&<div className={'pw-strength '+(strength?'s'+strength:'')} aria-label={'Password strength '+strength+' of 4'}><i/><i/><i/><i/></div>}
          </div>

          {signup&&<label className="terms">
            <input type="checkbox" required/>
            <span>I agree to the <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</span>
          </label>}

          {error&&<p role="alert" className="error-message">{error}</p>}

          <button className="auth-btn" disabled={busy}>
            {busy?'Please wait…':signup?'Create account':'Log in'}
            {!busy&&<Icon name="chevron" size={16}/>}
          </button>
        </form>

        <p className="auth-foot">{signup?'Already have an account?':'New to Format Blink?'} <a href={signup?'/login':'/signup'}>{signup?'Log in':'Create account'}</a></p>

        {!signup&&<div className="demo-panel">
          <div className="head"><Icon name="devices" size={16}/>Explore the admin demo</div>
          <p>A shared demo account for reviewing the website controls.</p>
          <button type="button" className="demo-btn" onClick={()=>{setEmail('admin@formatblink.demo');setPassword('BlinkDemo!2026')}}>Use demo account</button>
          <div className="cred">admin@formatblink.demo · BlinkDemo!2026</div>
        </div>}
      </section>
    </div>
  </div>;
}
