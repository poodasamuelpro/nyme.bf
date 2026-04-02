// src/app/api/admin/payer-coursier/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const supabaseCheck = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user: caller } } = await supabaseCheck.auth.getUser(token)
    if (!caller) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: callerRow } = await supabaseAdmin
      .from('utilisateurs').select('role').eq('id', caller.id).single()
    if (callerRow?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé — rôle admin requis' }, { status: 403 })
    }

    const { coursier_id, montant, description } = await req.json()
    if (!coursier_id || !montant || montant <= 0) {
      return NextResponse.json({ error: 'coursier_id et montant (> 0) sont requis' }, { status: 400 })
    }

    const { data: utilisateur } = await supabaseAdmin
      .from('utilisateurs')
      .select('id, nom, role')
      .eq('id', coursier_id)
      .single()

    if (!utilisateur || utilisateur.role !== 'coursier') {
      return NextResponse.json({ error: 'Coursier introuvable' }, { status: 404 })
    }

    try {
      const { data: txId, error: rpcErr } = await supabaseAdmin.rpc('process_wallet_transaction', {
        p_user_id:    coursier_id,
        p_type:       'gain',
        p_montant:    montant,
        p_description: description || `Paiement admin — ${new Date().toLocaleDateString('fr-FR')}`,
      })
      if (!rpcErr && txId) {
        await supabaseAdmin.from('notifications').insert({
          user_id: coursier_id, 
          type: 'paiement',
          titre: '💰 Paiement reçu',
          message: `Vous avez reçu ${Number(montant).toLocaleString('fr-FR')} FCFA. ${description || ''}`.trim(),
          lu: false, 
          created_at: new Date().toISOString(),
        }).catch(error => {
          console.error('Erreur notification:', error)
        })
        
        return NextResponse.json({ 
          success: true, 
          message: `Paiement de ${montant} FCFA effectué pour ${utilisateur.nom}`, 
          transaction_id: txId 
        })
      }
    } catch {}

    let wallet: any
    const { data: existingWallet } = await supabaseAdmin
      .from('wallets').select('id, solde, total_gains, total_retraits').eq('user_id', coursier_id).single()

    if (!existingWallet) {
      const { data: newWallet, error: createErr } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: coursier_id, solde: 0, updated_at: new Date().toISOString() })
        .select().single()
      if (createErr) return NextResponse.json({ error: `Erreur création wallet: ${createErr.message}` }, { status: 400 })
      wallet = newWallet
    } else {
      wallet = existingWallet
    }

    const soldeAvant  = Number(wallet.solde || 0)
    const soldeApres  = soldeAvant + Number(montant)

    const { error: updateErr } = await supabaseAdmin
      .from('wallets')
      .update({
        solde:          soldeApres,
        total_gains:    Number(wallet.total_gains || 0) + Number(montant),
        updated_at:     new Date().toISOString(),
      })
      .eq('user_id', coursier_id)

    if (updateErr) {
      return NextResponse.json({ error: `Erreur mise à jour wallet: ${updateErr.message}` }, { status: 400 })
    }

    const { data: tx } = await supabaseAdmin
      .from('transactions_wallet')
      .insert({
        user_id:     coursier_id,
        type:        'gain',
        montant:     Number(montant),
        solde_avant: soldeAvant,
        solde_apres: soldeApres,
        note:        description || `Paiement admin — ${new Date().toLocaleDateString('fr-FR')}`,
        created_at:  new Date().toISOString(),
      })
      .select().single()

    await supabaseAdmin
      .from('coursiers')
      .update({ total_gains: soldeApres })
      .eq('id', coursier_id)
      .catch(error => console.error('Erreur update coursiers:', error))

    await supabaseAdmin.from('notifications').insert({
      user_id: coursier_id, 
      type: 'paiement',
      titre: '💰 Paiement reçu',
      message: `Vous avez reçu ${Number(montant).toLocaleString('fr-FR')} FCFA. Nouveau solde : ${soldeApres.toLocaleString('fr-FR')} FCFA.`,
      lu: false, 
      created_at: new Date().toISOString(),
    }).catch(error => console.error('Erreur notification finale:', error))

    return NextResponse.json({
      success:       true,
      message:       `Paiement de ${montant} FCFA effectué pour ${utilisateur.nom}`,
      solde_avant:   soldeAvant,
      nouveau_solde: soldeApres,
      transaction_id: tx?.id,
    })

  } catch (err: any) {
    console.error('[admin/payer-coursier]', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}