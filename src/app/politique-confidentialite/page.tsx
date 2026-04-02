import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — NYME',
  description: 'Politique de confidentialité de NYME. Comment nous collectons, utilisons et protégeons vos données personnelles.',
  robots: 'index, follow',
}

const sections = [
  {
    id: 'intro', title: '1. Introduction',
    content: `NYME ("nous", "notre", "la Société") est une application mobile de livraison à la demande opérant au Burkina Faso et en Afrique de l'Ouest. Nous nous engageons à protéger la vie privée de tous nos utilisateurs — clients, coursiers et visiteurs de notre site web.

Cette politique de confidentialité explique quelles données nous collectons, pourquoi nous les collectons, comment nous les utilisons et quels droits vous avez sur vos informations personnelles.

En utilisant l'application NYME ou notre site web, vous acceptez les pratiques décrites dans cette politique.`
  },
  {
    id: 'collecte', title: '2. Données que nous collectons',
    content: `**2.1 Données que vous nous fournissez directement**

• Informations de compte : nom complet, adresse email, numéro de téléphone, mot de passe (chiffré)
• Photo de profil (optionnelle)
• Adresses de livraison et adresses favorites
• Informations de paiement Mobile Money (numéro, opérateur — jamais stockés en clair)
• Messages et communications via le chat intégré

**2.2 Données spécifiques aux coursiers**

• Photo de pièce d'identité (CNI ou passeport, recto et verso)
• Photo du permis de conduire
• Photo de la carte grise du véhicule
• Informations sur le véhicule (type, marque, modèle, couleur, plaque)
• Numéro WhatsApp professionnel

**2.3 Données collectées automatiquement**

• Localisation GPS en temps réel (uniquement pendant une course active)
• Données techniques : type d'appareil, système d'exploitation, version de l'app
• Journaux d'activité : connexions, actions dans l'app, erreurs techniques
• Token Firebase Cloud Messaging (FCM) pour les notifications push`
  },
  {
    id: 'utilisation', title: '3. Comment nous utilisons vos données',
    content: `Nous utilisons vos données personnelles pour les finalités suivantes :

• **Fourniture du service** : traitement des commandes, mise en relation clients/coursiers, suivi GPS des livraisons
• **Vérification d'identité** : validation manuelle des dossiers coursiers par notre équipe administrative
• **Communication** : notifications de statut de livraison, messages de service, alertes importantes
• **Paiement** : traitement des transactions via nos partenaires CinetPay et Flutterwave
• **Sécurité** : détection des fraudes, vérification des comptes, prévention des abus
• **Amélioration du service** : analyse des performances, correction des bugs, optimisation de l'expérience
• **Litiges** : résolution des conflits entre clients et coursiers, traitement des signalements
• **Obligations légales** : conformité avec les lois burkinabè en vigueur

Nous ne vendons jamais vos données personnelles à des tiers à des fins commerciales.`
  },
  {
    id: 'gps', title: '4. Données de localisation GPS',
    content: `La localisation GPS est au cœur de notre service de livraison. Voici comment nous la gérons :

**Pour les clients** : Votre position est utilisée uniquement pour suggérer votre adresse de départ. Nous ne trackons pas vos déplacements en dehors de l'app.

**Pour les coursiers** : Votre position GPS est collectée en temps réel uniquement lorsque vous êtes "En service" dans l'app. Elle est partagée avec le client concerné pendant la durée de sa livraison, puis supprimée de la vue publique. L'historique des positions est conservé 90 jours à des fins de traçabilité et résolution de litiges.

**Partage de suivi** : Les liens de suivi partagés avec les destinataires n'affichent que la position du coursier, pas vos informations personnelles.

Vous pouvez désactiver l'accès à votre localisation dans les paramètres de votre téléphone, mais certaines fonctionnalités de l'app ne seront plus disponibles.`
  },
  {
    id: 'partage', title: '5. Partage de vos données',
    content: `Nous pouvons partager vos données dans les cas suivants :

**Entre utilisateurs** : Lors d'une livraison, le client voit le prénom, la note, le type de véhicule et la photo du coursier. Le coursier voit le prénom du client et ses instructions de livraison. Ni les numéros de téléphone complets, ni les emails ne sont partagés directement — les communications passent par notre système intégré.

**Prestataires techniques** :
• Supabase (base de données et authentification — serveurs sécurisés)
• Firebase/Google (notifications push)
• CinetPay / Flutterwave (traitement des paiements)
• Mapbox / Google Maps (calcul d'itinéraires)

**Autorités légales** : Uniquement si requis par une décision judiciaire ou une obligation légale burkinabè.

**Transfert d'entreprise** : En cas de fusion ou acquisition, vos données pourraient être transférées sous les mêmes protections.`
  },
  {
    id: 'securite', title: '6. Sécurité des données',
    content: `Nous appliquons des mesures techniques et organisationnelles rigoureuses :

• Chiffrement en transit : toutes les communications sont sécurisées par HTTPS/TLS
• Chiffrement au repos : les données sensibles sont chiffrées en base de données
• Accès restreint : les photos d'identité des coursiers sont dans un espace de stockage privé accessible uniquement aux administrateurs NYME
• Row Level Security (RLS) : chaque utilisateur n'accède qu'à ses propres données
• Authentification sécurisée : tokens JWT avec expiration, mots de passe hachés (bcrypt)
• Authentification à deux facteurs (2FA) optionnelle

Malgré ces mesures, aucun système n'est infaillible. En cas de violation de données vous concernant, nous vous en informerons dans les meilleurs délais.`
  },
  {
    id: 'conservation', title: '7. Durée de conservation',
    content: `• **Compte actif** : vos données sont conservées tant que votre compte est actif
• **Compte supprimé** : suppression des données dans un délai de 30 jours, sauf obligation légale
• **Historique des livraisons** : conservé 3 ans pour résolution de litiges et obligations fiscales
• **Positions GPS** : historique conservé 90 jours
• **Messages** : conservés 1 an puis supprimés automatiquement
• **Documents d'identité coursiers** : conservés tant que le compte coursier est actif, supprimés 30 jours après clôture du compte`
  },
  {
    id: 'droits', title: '8. Vos droits',
    content: `Conformément aux lois applicables, vous disposez des droits suivants :

• **Droit d'accès** : obtenir une copie de vos données personnelles
• **Droit de rectification** : corriger des données inexactes ou incomplètes
• **Droit à l'effacement** : demander la suppression de vos données (sous réserve d'obligations légales)
• **Droit d'opposition** : vous opposer à certains traitements de vos données
• **Droit à la portabilité** : recevoir vos données dans un format lisible par machine

Pour exercer vos droits, contactez-nous à nyme.contact@gmail.com ou via le formulaire de contact. Nous traitons les demandes sous 30 jours.`
  },
  {
    id: 'cookies', title: '9. Cookies & technologies similaires',
    content: `Notre site web utilise des cookies techniques essentiels au fonctionnement du site. Nous n'utilisons pas de cookies publicitaires ou de trackers tiers à des fins de ciblage commercial.

**Cookies utilisés :**
• Cookies de session (authentification, préférences)
• Cookies d'analyse anonyme (performance du site, pages visitées — données agrégées uniquement)

Vous pouvez désactiver les cookies non essentiels dans les paramètres de votre navigateur.`
  },
  {
    id: 'mineurs', title: '10. Protection des mineurs',
    content: `NYME n'est pas destiné aux personnes de moins de 18 ans. Nous ne collectons pas sciemment de données personnelles d'enfants. Si vous pensez qu'un mineur a créé un compte, contactez-nous immédiatement à nyme.contact@gmail.com pour suppression.`
  },
  {
    id: 'modifications', title: '11. Modifications de cette politique',
    content: `Nous pouvons mettre à jour cette politique de confidentialité. En cas de modifications importantes, nous vous en informerons par notification dans l'app et par email (si fourni) au moins 15 jours avant l'entrée en vigueur des changements.

La date de dernière mise à jour est indiquée en haut de cette page. L'utilisation continue de l'app après modification vaut acceptation de la nouvelle politique.`
  },
  {
    id: 'contact', title: '12. Contact & réclamations',
    content: `Pour toute question relative à cette politique ou à vos données personnelles :

📧 Email : nyme.contact@gmail.com
📞 Téléphone : +226 00 00 00 00
📍 Adresse : Ouagadougou, Burkina Faso

Si vous estimez que vos droits n'ont pas été respectés, vous pouvez déposer une réclamation auprès des autorités de protection des données compétentes au Burkina Faso.`
  },
]

function renderContent(content: string) {
  return content.split('\n\n').map((para, i) => (
    <p key={i} className={para.startsWith('•') ? 'ml-2' : ''}>
      {para.split('**').map((part, j) =>
        j % 2 === 1
          ? <strong key={j} className="text-white font-bold">{part}</strong>
          : part
      )}
    </p>
  ))
}

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-nyme-dark pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-nyme-blue-light/25 mb-6">
            <span className="text-nyme-blue-light text-sm font-semibold font-body">🔒 Vos données, votre vie privée</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Politique de Confidentialité
          </h1>
          <p className="text-white/60 font-body text-base">
            Dernière mise à jour : Mars 2025 · Applicable à l'application NYME (Android & iOS)
          </p>
          <p className="text-white/45 font-body text-sm mt-2">
            Contact :{' '}
            <a href="mailto:nyme.contact@gmail.com" className="text-nyme-orange hover:underline font-semibold">
              nyme.contact@gmail.com
            </a>
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id} id={section.id} className="glass rounded-2xl p-6 sm:p-8 border border-white/10 hover:border-white/20 transition-colors duration-300">
              <h2 className="font-heading text-lg sm:text-xl font-bold text-white mb-4 pb-3 border-b border-nyme-orange/20">
                {section.title}
              </h2>
              <div className="text-white/75 font-body text-sm leading-relaxed space-y-3 whitespace-pre-line">
                {renderContent(section.content)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
