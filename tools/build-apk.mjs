/* Fascinations — construit dist/fascinations.apk sans SDK Android installé.
   Les outils viennent de Maven Central (dl.google.com n'est pas toujours joignable) :
     aapt2 et la table de ressources du système : dans apktool (org.apktool:apktool-cli) ;
     dx (com.jakewharton.android.repackaged:dalvik-dx) pour le code Dalvik ;
     android.jar de l'API 16 (com.google.android:android) pour compiler ;
     apksig (com.android.tools.build:apksig) pour signer (schémas v1 et v2).
   Il faut Java (javac) et ImageMagick n'est pas nécessaire (les icônes sont dans android/res).
   Usage : FASC_KEYSTORE=/chemin/hors/du/depot/cle.p12 FASC_KEYSTORE_PASS=… node tools/build-apk.mjs [jeunesse]
   La clé de signature (PKCS12) n'est jamais dans le dépôt : l'ancienne android/fascinations.p12, publiée avec son mot de passe,
   est compromise (audit n° 1, P-S14). Le script refuse de signer si la clé manque ou si elle se trouve sous la racine du dépôt.
   FASC_KEY_ALIAS (facultatif) donne l'alias de la clé, « fascinations » par défaut. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const AND = path.join(ROOT, 'android');
const CACHE = path.join(os.homedir(), '.cache', 'fascinations-apk');
// node tools/build-apk.mjs jeunesse : Fascinations Labo (autre identifiant : les deux applications s'installent côte à côte)
const JEUNE = process.argv[2] === 'jeunesse';
const OUT = path.join(ROOT, 'dist', JEUNE ? 'fascinations-labo.apk' : 'fascinations.apk');
const W = path.join(os.tmpdir(), JEUNE ? 'fascinations-labo-apk-build' : 'fascinations-apk-build');
const M = 'https://repo1.maven.org/maven2';
/* les jars s'exécutent pendant que la clé est présente : chacun est épinglé par son SHA-256
   (calculé le 12/11/2026 sur un téléchargement dont le .sha1 de Maven Central concordait ; .sha256 publié concordant pour dx) */
const TOOLS = {
  apktool: [`${M}/org/apktool/apktool-cli/3.0.3/apktool-cli-3.0.3.jar`, '29fc610eed9dd349e75d40fd5af02538e0118b08d56a61ef6f53f8256adadc9a'],
  dx: [`${M}/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar`, '1e4b645628e3bdb097b5331d669e177ef235a551582a8c646dbe36865e541907'],
  android: [`${M}/com/google/android/android/4.1.1.4/android-4.1.1.4.jar`, '84072541cbb711eff89f7277100ff854929a446dba7ceb1b195c340e0b4fd3cb'],
  apksig: [`${M}/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar`, '9637078c0016244e4be0941836295365a7e2e5b164c59cb7885783c40460bfee'],
};
/* 0. la clé de signature, lue hors du dépôt : on vérifie avant tout le reste pour ne rien construire en vain */
const stop = (msg) => { console.error('✗ ' + msg); process.exit(1); };
const KEY = { file: process.env.FASC_KEYSTORE || '', alias: process.env.FASC_KEY_ALIAS || 'fascinations' };
if (!KEY.file) stop('FASC_KEYSTORE manque : donnez le chemin de la clé de signature (hors du dépôt).');
if (!process.env.FASC_KEYSTORE_PASS) stop('FASC_KEYSTORE_PASS manque : donnez le mot de passe de la clé dans cette variable d’environnement.');
if (!fs.existsSync(KEY.file)) stop(`clé introuvable : ${KEY.file} (le script ne crée plus de clé lui-même).`);
{
  const reel = fs.realpathSync(path.resolve(KEY.file)), racine = fs.realpathSync(ROOT);
  const rel = path.relative(racine, reel);
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) stop(`la clé est dans le dépôt (${rel}) : déplacez-la hors de ${racine}.`);
}

const run = (cmd, args, opt = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'], ...opt }).toString();
const log = (s) => console.log('· ' + s);

/* 1. les outils */
fs.mkdirSync(CACHE, { recursive: true });
const jar = {};
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
for (const [k, [url, attendu]] of Object.entries(TOOLS)) {
  const f = path.join(CACHE, path.basename(url));
  if (!fs.existsSync(f)) { log('téléchargement ' + path.basename(url)); run('curl', ['-sSfL', '-o', f, url]); }
  const vu = sha256(f); // vérifié à chaque construction, cache compris
  if (vu !== attendu) { fs.rmSync(f, { force: true }); stop(`${path.basename(url)} : SHA-256 inattendu (${vu}) ; fichier supprimé, rien n'est signé.`); }
  jar[k] = f;
}
// aapt2 et la table du système sont réextraits à chaque fois du jar vérifié (on ne fait pas confiance à une ancienne extraction)
const AAPT2 = path.join(CACHE, 'prebuilt/linux/aapt2'), FRAMEWORK = path.join(CACHE, 'prebuilt/android-framework.jar');
run('unzip', ['-o', '-q', jar.apktool, 'prebuilt/linux/aapt2', 'prebuilt/android-framework.jar', '-d', CACHE]); fs.chmodSync(AAPT2, 0o755);

/* 2. l'application web, en un seul fichier, avec les polices en local */
log('assemblage de l’application web');
run('node', [path.join(ROOT, 'tools/build.mjs'), JEUNE ? 'jeunesse' : 'adulte']);
fs.rmSync(W, { recursive: true, force: true });
const ASSETS = path.join(W, 'assets');
fs.mkdirSync(ASSETS, { recursive: true });
let html = fs.readFileSync(path.join(ROOT, JEUNE ? 'dist/jeunesse.html' : 'dist/fascination.html'), 'utf8');
if (JEUNE || !html.includes('fonts.googleapis')) {
  // l'application unique (branche app-unique) et la version jeunesse embarquent déjà leurs polices
  html = html.replace('</head>', '<script>window.FASC_APK = true;</script>\n</head>');
  fs.writeFileSync(path.join(ASSETS, 'index.html'), html);
} else {
const FF = [['Space Grotesk', 'space-grotesk', [400, 500, 700]], ['JetBrains Mono', 'jetbrains-mono', [400, 500]]];
let css = '';
for (const [fam, base, ws] of FF) for (const w of ws) {
  const f = `${base}-latin-${w}-normal.woff2`;
  // intégrées en data URI : en file://, la WebView peut refuser de charger une police d'un fichier voisin (règles CORS)
  const b64 = fs.readFileSync(path.join(AND, 'fonts', f)).toString('base64');
  css += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2')}\n`;
}
const before = html.length;
html = html.replace(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g, '');
if (html.length === before) console.warn('  (aucun lien Google Fonts trouvé : vérifier les polices)');
html = html.replace('</head>', `<style>\n${css}</style>\n<script>window.FASC_APK = true;</script>\n</head>`);
fs.writeFileSync(path.join(ASSETS, 'index.html'), html);
}

/* 3. ressources et manifeste */
log('ressources (aapt2)');
const FLAT = path.join(W, 'res.zip');
run(AAPT2, ['compile', '--dir', path.join(AND, JEUNE ? 'res-jeunesse' : 'res'), '-o', FLAT]);
const UNSIGNED = path.join(W, 'base.apk');
let MANIF = path.join(AND, 'AndroidManifest.xml');
if (JEUNE) {
  MANIF = path.join(W, 'AndroidManifest.xml');
  fs.writeFileSync(MANIF, fs.readFileSync(path.join(AND, 'AndroidManifest.xml'), 'utf8')
    .replace('package="fr.fascinations.app"', 'package="fr.fascinations.labo"')
    .replace('android:name=".MainActivity"', 'android:name="fr.fascinations.app.MainActivity"')
    .replace('android:label="Fascinations"', 'android:label="Fascinations Labo"'));
}
run(AAPT2, ['link', '-o', UNSIGNED, '-I', FRAMEWORK, '--manifest', MANIF, '-A', ASSETS, '--min-sdk-version', '24', '--target-sdk-version', '34', '--version-code', String(versionCode()), '--version-name', versionName(), FLAT]);

/* 4. le code : javac → dx */
log('compilation Java et dx');
const CLS = path.join(W, 'classes'); fs.mkdirSync(CLS);
const srcs = listJava(path.join(AND, 'src'));
// l'annotation @JavascriptInterface (API 17) manque à l'android.jar de l'API 16 : une copie sert à compiler, sans entrer dans l'APK
const STUB = path.join(W, 'stub'); fs.mkdirSync(STUB);
run('javac', ['-nowarn', '--release', '8', '-d', STUB, ...listJava(path.join(AND, 'stubs'))]);
run('javac', ['-nowarn', '--release', '8', '-cp', jar.android + ':' + STUB, '-d', CLS, ...srcs]);
const DEX = path.join(W, 'dex'); fs.mkdirSync(DEX);
run('java', ['-cp', jar.dx, 'com.android.dx.command.Main', '--dex', '--min-sdk-version=24', '--output=' + path.join(DEX, 'classes.dex'), CLS]);
run('zip', ['-q', '-j', UNSIGNED, path.join(DEX, 'classes.dex')]);

/* 5. alignement sur 4 octets des fichiers non compressés (exigé pour resources.arsc à partir d'Android 11) puis signature */
const ALIGNED = path.join(W, 'aligned.apk');
run('python3', ['-I', path.join(ROOT, 'tools/zipalign.py'), UNSIGNED, ALIGNED]);
log('signature (apksig, schéma v2 : suffisant dès Android 7)');
const SIGNER = path.join(W, 'sign'); fs.mkdirSync(SIGNER);
fs.writeFileSync(path.join(SIGNER, 'Sign.java'), `
import com.android.apksig.*;
import java.io.*; import java.security.*; import java.security.cert.X509Certificate; import java.util.*;
public class Sign { public static void main(String[] a) throws Exception {
  char[] pw = System.getenv("FASC_KEYSTORE_PASS").toCharArray();
  KeyStore ks = KeyStore.getInstance("PKCS12"); try (InputStream in = new FileInputStream(a[2])) { ks.load(in, pw); }
  PrivateKey k = (PrivateKey) ks.getKey(a[3], pw); X509Certificate c = (X509Certificate) ks.getCertificate(a[3]);
  ApkSigner.SignerConfig sc = new ApkSigner.SignerConfig.Builder("FASCINAT", k, Collections.singletonList(c)).build();
  new ApkSigner.Builder(Collections.singletonList(sc)).setInputApk(new File(a[0])).setOutputApk(new File(a[1])).setMinSdkVersion(24).setV1SigningEnabled(false).setV2SigningEnabled(true).build().sign();
  ApkVerifier.Result r = new ApkVerifier.Builder(new File(a[1])).setMinCheckedPlatformVersion(24).build().verify();
  System.out.println("vérification : " + (r.isVerified() ? "valide" : "INVALIDE") + " · v1 " + r.isVerifiedUsingV1Scheme() + " · v2 " + r.isVerifiedUsingV2Scheme());
  for (ApkVerifier.IssueWithParams e : r.getErrors()) System.out.println("  erreur : " + e);
  if (!r.isVerified()) System.exit(1);
} }`);
run('javac', ['-nowarn', '-cp', jar.apksig, '-d', SIGNER, path.join(SIGNER, 'Sign.java')]);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
process.stdout.write(run('java', ['-Dstdout.encoding=UTF-8', '--add-exports=java.base/sun.security.x509=ALL-UNNAMED', '--add-exports=java.base/sun.security.pkcs=ALL-UNNAMED', '--add-exports=java.base/sun.security.util=ALL-UNNAMED', '-cp', `${jar.apksig}:${SIGNER}`, 'Sign', ALIGNED, OUT, KEY.file, KEY.alias]));
run('python3', ['-I', path.join(ROOT, 'tools/zipalign.py'), '--check', OUT]);
log(`${path.relative(ROOT, OUT)} : ${(fs.statSync(OUT).size / 1048576).toFixed(2)} Mo`);
process.stdout.write(run(AAPT2, ['dump', 'badging', OUT]).split('\n').filter((l) => /^(package|minSdkVersion|sdkVersion|targetSdkVersion|application-label|launchable)/.test(l)).join('\n') + '\n');

function listJava(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listJava(path.join(d, e.name)) : e.name.endsWith('.java') ? [path.join(d, e.name)] : [])); }
// version : nombre de commits (croît à chaque construction depuis git), nom : 0.1.<n>
function commits() { try { return parseInt(run('git', ['-C', ROOT, 'rev-list', '--count', 'HEAD']).trim(), 10) || 1; } catch (e) { return 1; } }
function versionCode() { return commits(); }
function versionName() { return '0.1.' + commits(); }
