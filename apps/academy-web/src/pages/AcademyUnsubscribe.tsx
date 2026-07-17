import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { academyApi } from '@/api/academy.api';
import { MailCheck } from 'lucide-react';

export function AcademyUnsubscribe(){const {token=''}=useParams();const [state,setState]=useState<'loading'|'done'|'error'>('loading');useEffect(()=>{academyApi.unsubscribeLead(token).then(()=>setState('done')).catch(()=>setState('error'));},[token]);return <main className="academy-profile-empty"><MailCheck/>{state==='loading'?<><h1>Aktualizujemy zapis…</h1><p>Prosimy o chwilę.</p></>:state==='done'?<><h1>Adres został wypisany</h1><p>Nie będziemy już wysyłać na ten adres newslettera ani materiałów marketingowych.</p><Link to="/">Wróć do Akademii</Link></>:<><h1>Link jest nieprawidłowy</h1><p>Nie udało się odnaleźć zapisu. Skontaktuj się z nami, jeżeli nadal otrzymujesz wiadomości.</p><Link to="/">Wróć do Akademii</Link></>}</main>}
