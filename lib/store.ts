import {env} from 'cloudflare:workers';
import {defaultConfig,mergeConfig,type Config} from './config';
export function database(){const db=(env as any).DB;if(!db)throw new Error('Settings service is unavailable. Please try again shortly.');return db as D1Database;}
export async function getConfig():Promise<Config>{const row=await database().prepare('SELECT value FROM settings WHERE id = ?').bind('site').first<{value:string}>();return row?mergeConfig(JSON.parse(row.value)):structuredClone(defaultConfig)}
export async function saveConfig(value:Config){await database().prepare('INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('site',JSON.stringify(value)).run()}
export async function record(userId:string|null,name:string,detail:string){await database().prepare('INSERT INTO activity(id,user_id,name,detail,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),userId,name,detail.slice(0,200),new Date().toISOString()).run()}
