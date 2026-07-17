import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export type CartItem={id:string;type:'course'|'bundle';title:string;slug:string;price:number;thumbnailUrl?:string|null};
type CartState={items:CartItem[];add:(item:CartItem)=>void;remove:(type:string,id:string)=>void;clear:()=>void};
export const useCartStore=create<CartState>()(persist(set=>({items:[],add:item=>set(state=>({items:state.items.some(row=>row.id===item.id&&row.type===item.type)?state.items:[...state.items,item]})),remove:(type,id)=>set(state=>({items:state.items.filter(row=>row.type!==type||row.id!==id)})),clear:()=>set({items:[]})}),{name:'academy-cart'}));
