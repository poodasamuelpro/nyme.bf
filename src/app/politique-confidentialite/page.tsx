import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — NYME',
  description: 'Politique de confidentialité de NYME. Découvrez comment nous collectons, utilisons et protégeons vos données personnelles sur la plateforme web et mobile NYME.',
  robots: 'index, follow',
}

const sections = [
  {
    id: 'intro', title: '1. Introduction et identité du responsable',
    content: `NYME (ci-après "NYME", "nous", "notre") est une plateforme numérique de livraison à la demande opérant depuis Ouagadougou, Burkina Faso, et destinée aux marchés d'Afrique de l'Ouest.

En tant que responsable du traitement de vos données personnelles, NYME s'engage à respecter votre vie privée et à protéger toutes les informations que vous nous confiez, conformément aux lois et réglementations applicables au Burkina Faso en matière de protection des données personnelles.

La présente Politique de Confidentialité s'applique à l'ensemble des services NYME : site web, application web, et application mobile (Android & iOS). Elle décrit de manière transparente quelles données nous collectons, pourquoi nous les collectons, comment nous les utilisons, avec qui nous les partageons et quels sont vos droits.

En accédant à nos services, vous reconnaissez avoir pris connaissance de la présente politique et en accepter les termes. Si vous n'acceptez pas cette politique, nous vous invitons à ne pas utiliser nos services.

**Responsable du traitement :**
Dénomination : NYME
Localisation : Ouagadougou, Burkina Faso
Email de contact : nyme.contact@gmail.com
Téléphone : +226 22 67 79 80 264`
  },
  {
    id: 'collecte', title: '2. Données personnelles que nous collectons',
    content: `Nous collectons uniquement les données strictement nécessaires à la fourniture de nos services. Voici le détail des données collectées selon votre profil :

**2.1 Données que vous nous fournissez lors de l'inscription**

• Nom complet et prénom
• Adresse email valide
• Numéro de téléphone (format Burkina Faso ou Afrique de l'Ouest)
• Mot de passe (stocké sous forme chiffrée, jamais en clair)
• Photo de profil (facultative)

**2.2 Données collectées lors de l'utilisation du service**

• Adresses de livraison (départ, arrivée, adresses favorites enregistrées)
• Historique complet de vos commandes et livraisons
• Évaluations et avis laissés sur les coursiers
• Messages échangés via le chat intégré de l'application
• Signalements soumis à notre équipe

**2.3 Données spécifiques aux coursiers**

Dans le cadre du processus de vérification obligatoire avant toute activité :
• Scan recto/verso de la pièce d'identité (Carte Nationale d'Identité ou passeport)
• Scan du permis de conduire en cours de validité
• Scan de la carte grise du véhicule
• Informations sur le véhicule (type, marque, couleur, numéro d'immatriculation)
• Numéro WhatsApp professionnel

**2.4 Données collectées automatiquement**

• Localisation GPS en temps réel (uniquement lorsque la course est active)
• Données techniques de connexion : type d'appareil, système d'exploitation, version de l'application
• Adresse IP et données de navigation sur le site web
• Journaux d'activité : connexions, actions effectuées, erreurs techniques rencontrées
• Jeton de notification (pour les notifications push sur mobile)

**2.5 Données relatives aux paiements**

• Numéro de téléphone associé à votre compte Mobile Money (Orange Money, Moov Money, Wave)
• Référence des transactions de paiement
• Historique des paiements et recharges de wallet

⚠️ Aucun numéro de carte bancaire ou code de paiement n'est stocké directement sur nos serveurs. Les paiements sont traités par des prestataires sécurisés et certifiés.`
  },
  {
    id: 'utilisation', title: '3. Finalités et base légale du traitement',
    content: `Chaque traitement de données personnelles repose sur une base légale précise. Voici l'ensemble des finalités pour lesquelles nous utilisons vos données :

**3.1 Exécution du contrat (fourniture du service)**
• Traitement et gestion de vos commandes de livraison
• Mise en relation clients et coursiers disponibles
• Calcul du prix selon la distance et les paramètres de la course
• Gestion du système de négociation de prix
• Traitement et confirmation des paiements
• Suivi GPS des livraisons en temps réel
• Envoi de notifications de statut à chaque étape de la livraison
• Gestion de votre wallet et des opérations financières associées

**3.2 Obligations légales**
• Vérification de l'identité des coursiers avant activation de leur compte
• Conservation des données de transaction pour les obligations comptables et fiscales
• Transmission aux autorités en cas de réquisition judiciaire

**3.3 Intérêts légitimes de NYME**
• Sécurisation de la plateforme et prévention des fraudes
• Détection et gestion des comportements abusifs
• Amélioration continue de nos services et de l'expérience utilisateur
• Résolution des litiges entre clients et coursiers
• Analyse des performances et correction des dysfonctionnements techniques

**3.4 Consentement (communications marketing)**
• Envoi d'informations sur les nouveautés et offres NYME (uniquement si vous y avez consenti)
• Notifications personnalisées sur votre utilisation du service

Vous pouvez retirer votre consentement aux communications marketing à tout moment depuis les paramètres de votre compte ou en nous contactant.

**Ce que nous ne faisons jamais :**
Nous ne vendons, ne louons et ne cédons jamais vos données personnelles à des tiers à des fins commerciales.`
  },
  {
    id: 'gps', title: '4. Traitement des données de géolocalisation',
    content: `La géolocalisation est une fonctionnalité centrale de notre service de livraison. Nous la traitons avec la plus grande rigueur :

**Pour les clients**
Votre position GPS est utilisée uniquement pour pré-remplir votre adresse de départ et calculer l'itinéraire. Nous ne collectons pas votre position en dehors d'une commande active et ne surveillons pas vos déplacements.

**Pour les coursiers**
La position GPS du coursier est collectée en temps réel uniquement lorsqu'il est en statut "En service" ou qu'une course est en cours. Cette position est :
• Affichée au client concerné par la livraison active, en temps réel sur la carte
• Partageable avec le destinataire via un lien de suivi sécurisé
• Conservée dans notre historique pendant 90 jours pour permettre la résolution de litiges éventuels
• Non accessible aux autres utilisateurs une fois la course terminée

**Liens de suivi pour les destinataires**
Lorsque vous partagez un lien de suivi avec un destinataire, celui-ci ne voit que la position du coursier sur la carte. Aucune de vos informations personnelles (nom, téléphone, email) n'est incluse dans ce lien.

**Contrôle de la localisation**
Vous conservez à tout moment la maîtrise de l'accès à votre géolocalisation via les paramètres de votre appareil. La désactivation de la localisation limitera certaines fonctionnalités de l'application (calcul de distance automatique, suivi GPS).`
  },
  {
    id: 'partage', title: '5. Partage et destinataires des données',
    content: `Vos données ne sont partagées que dans les situations strictement nécessaires, décrites ci-dessous :

**5.1 Partage entre utilisateurs de la plateforme**
Lors d'une course, les informations échangées sont limitées au strict nécessaire :
• Le client voit : le prénom du coursier, sa note moyenne, son type de véhicule et sa photo de profil
• Le coursier voit : le prénom du client et les instructions de livraison
• Les communications entre client et coursier passent par le système de messagerie intégré — les numéros de téléphone complets et adresses email ne sont jamais échangés directement

**5.2 Prestataires techniques (sous-traitants)**
Nous faisons appel à des prestataires techniques pour faire fonctionner notre infrastructure. Tous nos prestataires sont sélectionnés pour leurs garanties de sécurité et s'engagent contractuellement à ne pas utiliser vos données à d'autres fins :
• Infrastructure sécurisée d'hébergement et de base de données
• Système de notifications push (gestion des alertes mobiles)
• Prestataires de paiement certifiés (traitement des transactions Mobile Money)
• Services de cartographie et calcul d'itinéraires

**5.3 Autorités légales et judiciaires**
Nous pouvons être amenés à communiquer vos données aux autorités compétentes uniquement en cas de réquisition judiciaire valable, d'obligation légale ou pour protéger les droits, la sécurité ou les biens de NYME, de ses utilisateurs ou du public.

**5.4 Cession ou fusion d'entreprise**
En cas d'acquisition, fusion ou cession totale ou partielle des actifs de NYME, vos données pourront être transférées au nouvel entité. Vous serez informé au préalable et bénéficierez des mêmes protections.`
  },
  {
    id: 'securite', title: '6. Sécurité et protection des données',
    content: `La protection de vos données est une priorité absolue. Nous mettons en œuvre des mesures techniques et organisationnelles rigoureuses :

**Mesures techniques**
• Chiffrement de toutes les communications entre votre appareil et nos serveurs (protocole HTTPS/TLS)
• Chiffrement des données sensibles stockées en base de données
• Contrôle d'accès strict : chaque utilisateur n'accède qu'à ses propres données
• Documents d'identité des coursiers stockés dans un espace de stockage privé, accessible uniquement aux administrateurs NYME habilités
• Authentification sécurisée par jetons à durée de vie limitée, et mots de passe chiffrés via algorithme de hachage robuste
• Authentification à deux facteurs (2FA) disponible

**Mesures organisationnelles**
• Accès aux données limité aux seuls collaborateurs NYME qui en ont besoin dans l'exercice de leurs fonctions
• Sensibilisation de notre équipe aux bonnes pratiques de sécurité
• Revue régulière des accès et des politiques de sécurité
• Procédure de réponse aux incidents de sécurité

**En cas de violation de données**
Malgré toutes nos précautions, aucun système ne peut garantir une sécurité absolue. En cas d'incident de sécurité susceptible de porter atteinte à vos droits et libertés, nous vous en informerons dans les meilleurs délais, conformément à nos obligations légales.`
  },
  {
    id: 'conservation', title: '7. Durées de conservation des données',
    content: `Nous ne conservons vos données que le temps strictement nécessaire aux finalités pour lesquelles elles ont été collectées :

• **Compte actif** : vos données sont conservées tout au long de la vie de votre compte
• **Compte inactif** : après 18 mois sans connexion, nous vous informons avant toute suppression
• **Compte supprimé à votre demande** : suppression effective sous 30 jours, sauf obligations légales contraires
• **Historique des livraisons** : conservé 3 ans à compter de la livraison, pour permettre la résolution de litiges et respecter les obligations comptables
• **Données de géolocalisation** : l'historique des positions GPS est conservé 90 jours puis supprimé automatiquement
• **Messages de chat** : conservés 12 mois puis supprimés automatiquement
• **Documents d'identité des coursiers** : conservés pendant toute la durée d'activité du compte coursier et supprimés dans les 30 jours suivant la clôture du compte
• **Données de paiement** : références de transactions conservées 5 ans conformément aux obligations comptables légales

À l'expiration de ces délais, les données sont supprimées de manière sécurisée et irréversible.`
  },
  {
    id: 'droits', title: '8. Vos droits sur vos données personnelles',
    content: `Conformément aux lois applicables en matière de protection des données, vous disposez des droits suivants sur vos données personnelles :

**Droit d'accès**
Vous pouvez obtenir la confirmation que nous traitons vos données et en demander une copie complète.

**Droit de rectification**
Vous pouvez demander la correction de données inexactes ou incomplètes vous concernant. Vous pouvez également mettre à jour la plupart de vos informations directement dans les paramètres de votre compte.

**Droit à l'effacement ("droit à l'oubli")**
Vous pouvez demander la suppression de vos données personnelles, sous réserve de nos obligations légales de conservation (historique financier, obligations comptables).

**Droit à la limitation du traitement**
Dans certains cas, vous pouvez demander que nous limitions le traitement de vos données (par exemple pendant la vérification d'une contestation).

**Droit d'opposition**
Vous pouvez vous opposer au traitement de vos données pour des finalités de prospection commerciale ou lorsque nous invoquons notre intérêt légitime, pour des raisons tenant à votre situation particulière.

**Droit à la portabilité**
Vous pouvez recevoir vos données dans un format structuré, lisible par machine, et les transmettre à un autre prestataire.

**Comment exercer vos droits ?**
Contactez-nous à : nyme.contact@gmail.com
📞 +226 22 67 79 80 264
Nous traitons toutes les demandes dans un délai maximum de 30 jours.`
  },
  {
    id: 'cookies', title: '9. Cookies et technologies similaires',
    content: `Notre site web utilise des cookies et technologies similaires pour assurer son bon fonctionnement et améliorer votre expérience.

**Cookies strictement nécessaires**
Ces cookies sont indispensables au fonctionnement du site. Ils permettent notamment de gérer votre session d'authentification et vos préférences de navigation. Ils ne peuvent pas être désactivés sans affecter le fonctionnement du site.

**Cookies de performance et d'analyse**
Ces cookies nous permettent de comprendre comment vous interagissez avec notre site (pages visitées, temps passé, erreurs rencontrées). Ces analyses sont réalisées de manière agrégée et anonymisée — elles n'identifient pas les utilisateurs individuellement. Ils nous aident à améliorer continuellement nos services.

**Cookies que nous n'utilisons PAS**
Nous n'utilisons aucun cookie publicitaire, aucun traceur de ciblage comportemental et aucun cookie de réseaux sociaux tiers à des fins de profilage commercial.

**Gestion de vos préférences**
Vous pouvez configurer votre navigateur pour accepter, refuser ou supprimer les cookies à tout moment. La désactivation des cookies strictement nécessaires peut altérer le fonctionnement du site.`
  },
  {
    id: 'mineurs', title: '10. Protection des mineurs',
    content: `Les services NYME sont exclusivement destinés aux personnes âgées de 18 ans et plus. Nous ne collectons pas sciemment de données personnelles concernant des mineurs.

Si vous êtes le parent ou tuteur légal d'un mineur et que vous pensez qu'un compte a été créé sans votre consentement, contactez-nous immédiatement à nyme.contact@gmail.com. Nous procéderons à la vérification et à la suppression du compte dans les meilleurs délais.`
  },
  {
    id: 'transferts', title: '11. Transferts internationaux de données',
    content: `Dans le cadre de nos activités, certaines données peuvent être traitées par des prestataires dont les serveurs sont situés en dehors du Burkina Faso. Ces transferts sont effectués uniquement vers des pays ou des prestataires offrant un niveau de protection adéquat, reconnu comme tel par les autorités compétentes, ou dans le cadre de garanties contractuelles appropriées.

Nous veillons à ce que chaque transfert de données soit encadré par des mesures de protection conformes aux standards internationaux en vigueur (clauses contractuelles types, certifications de sécurité reconnues).`
  },
  {
    id: 'modifications', title: '12. Modifications de la présente politique',
    content: `Nous nous réservons le droit de modifier la présente Politique de Confidentialité à tout moment pour refléter les évolutions de nos services, les changements légaux ou réglementaires, ou des améliorations de nos pratiques en matière de protection des données.

En cas de modifications substantielles affectant vos droits ou la façon dont nous traitons vos données, nous vous en informerons :
• Par notification dans l'application (mobile et web)
• Par email si vous nous avez fourni votre adresse

Ces modifications prendront effet 15 jours après la notification, sauf obligation légale contraire. La poursuite de l'utilisation de nos services après cette période vaut acceptation de la politique mise à jour.

La date de dernière mise à jour est indiquée en en-tête de cette page.`
  },
  {
    id: 'contact', title: '13. Contact, réclamations et délégué à la protection des données',
    content: `Pour toute question, demande ou réclamation relative à la présente Politique de Confidentialité ou au traitement de vos données personnelles, vous pouvez nous contacter :

📧 Email : nyme.contact@gmail.com
📞 Téléphone : +226 22 67 79 80 264
📍 Adresse : Ouagadougou, Burkina Faso

Nous nous engageons à répondre à toute demande dans un délai maximum de 30 jours ouvrables.

**Réclamations auprès des autorités**
Si vous estimez, après nous avoir contactés, que vos droits n'ont pas été respectés, vous avez la possibilité de déposer une réclamation auprès des autorités de protection des données personnelles compétentes au Burkina Faso ou dans votre pays de résidence.`
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
            Dernière mise à jour : Avril 2025 · Applicable à la plateforme web et à l'application mobile NYME
          </p>
          <p className="text-white/45 font-body text-sm mt-2">
            Contact :{' '}
            <a href="mailto:nyme.contact@gmail.com" className="text-nyme-orange hover:underline font-semibold">
              nyme.contact@gmail.com
            </a>
          </p>
        </div>

        {/* Table des matières */}
        <div className="glass rounded-2xl p-5 sm:p-6 border border-white/10 mb-8">
          <h2 className="font-heading text-base font-bold text-white mb-4">📋 Sommaire</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}
                className="text-white/60 hover:text-nyme-orange text-sm font-body transition-colors hover:translate-x-1 inline-block">
                → {s.title}
              </a>
            ))}
          </div>
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

        <div className="mt-10 p-5 rounded-2xl glass border border-nyme-orange/20 text-center">
          <p className="text-white/55 font-body text-sm">
            Des questions sur vos données ?{' '}
            <a href="/contact" className="text-nyme-orange hover:underline font-semibold">Contactez-nous</a>
            {' '}ou écrivez à{' '}
            <a href="mailto:nyme.contact@gmail.com" className="text-nyme-orange hover:underline font-semibold">nyme.contact@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}