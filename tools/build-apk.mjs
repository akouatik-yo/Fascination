/* Fascinations — construit dist/fascinations.apk sans SDK Android installé.
   Les outils viennent de Maven Central (dl.google.com n'est pas toujours joignable) :
     aapt2 et la table de ressources du système : dans apktool (org.apktool:apktool-cli) ;
     dx (com.jakewharton.android.repackaged:dalvik-dx) pour le code Dalvik ;
     android.jar de l'API 16 (com.google.android:android) pour compiler ;
     apksig (com.android.tools.build:apksig) pour signer (schémas v1 et v2).
   Il faut Java (javac, keytool) et ImageMagick n'est pas nécessaire (les icônes sont dans android/res).
   Usage : node tools/build-apk.mjs   (la clé de signature est android/fascinations.p12) */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const AND = path.join(ROOT, 'android');
const CACHE = path.join(os.homedir(), '.cache', 'fascinations-apk');
const OUT = path.join(ROOT, 'dist', 'fascinations.apk');
const W = path.join(os.tmpdir(), 'fascinations-apk-build');
const M = 'https://repo1.maven.org/maven2';
const TOOLS = {
  apktool: `${M}/org/apktool/apktool-cli/3.0.3/apktool-cli-3.0.3.jar`,
  dx: `${M}/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar`,
  android: `${M}/com/google/android/android/4.1.1.4/android-4.1.1.4.jar`,
  apksig: `${M}/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar`,
};
const KEY = { file: path.join(AND, 'fascinations.p12'), alias: 'fascinations', pass: 'fascinations' };

const run = (cmd, args, opt = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'], ...opt }).toString();
const log = (s) => console.log('· ' + s);

/* 1. les outils */
fs.mkdirSync(CACHE, { recursive: true });
const jar = {};
for (const [k, url] of Object.entries(TOOLS)) {
  const f = path.join(CACHE, path.basename(url));
  if (!fs.existsSync(f)) { log('téléchargement ' + path.basename(url)); run('curl', ['-sSfL', '-o', f, url]); }
  jar[k] = f;
}
const AAPT2 = path.join(CACHE, 'prebuilt/linux/aapt2'), FRAMEWORK = path.join(CACHE, 'prebuilt/android-framework.jar');
if (!fs.existsSync(AAPT2)) { run('unzip', ['-o', '-q', jar.apktool, 'prebuilt/linux/aapt2', 'prebuilt/android-framework.jar', '-d', CACHE]); fs.chmodSync(AAPT2, 0o755); }

/* 2. l'application web, en un seul fichier, avec les polices en local */
log('assemblage de l’application web');
run('node', [path.join(ROOT, 'tools/build.mjs')]);
fs.rmSync(W, { recursive: true, force: true });
const ASSETS = path.join(W, 'assets');
fs.mkdirSync(ASSETS, { recursive: true });
let html = fs.readFileSync(path.join(ROOT, 'dist/fascination.html'), 'utf8');
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

/* 3. ressources et manifeste */
log('ressources (aapt2)');
const FLAT = path.join(W, 'res.zip');
run(AAPT2, ['compile', '--dir', path.join(AND, 'res'), '-o', FLAT]);
const UNSIGNED = path.join(W, 'base.apk');
run(AAPT2, ['link', '-o', UNSIGNED, '-I', FRAMEWORK, '--manifest', path.join(AND, 'AndroidManifest.xml'), '-A', ASSETS, '--min-sdk-version', '24', '--target-sdk-version', '34', '--version-code', String(versionCode()), '--version-name', versionName(), FLAT]);

/* 4. le code : javac → dx */
log('compilation Java et dx');
const CLS = path.join(W, 'classes'); fs.mkdirSync(CLS);
const srcs = listJava(path.join(AND, 'src'));
run('javac', ['-nowarn', '--release', '8', '-cp', jar.android, '-d', CLS, ...srcs]);
const DEX = path.join(W, 'dex'); fs.mkdirSync(DEX);
run('java', ['-cp', jar.dx, 'com.android.dx.command.Main', '--dex', '--min-sdk-version=24', '--output=' + path.join(DEX, 'classes.dex'), CLS]);
run('zip', ['-q', '-j', UNSIGNED, path.join(DEX, 'classes.dex')]);

/* 5. alignement sur 4 octets des fichiers non compressés (exigé pour resources.arsc à partir d'Android 11) puis signature */
const ALIGNED = path.join(W, 'aligned.apk');
run('python3', ['-I', path.join(ROOT, 'tools/zipalign.py'), UNSIGNED, ALIGNED]);
if (!fs.existsSync(KEY.file)) {
  log('création de la clé de signature android/fascinations.p12');
  run('keytool', ['-genkeypair', '-keystore', KEY.file, '-storetype', 'PKCS12', '-storepass', KEY.pass, '-keypass', KEY.pass, '-alias', KEY.alias, '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Fascinations, O=Fascinations, C=FR']);
}
log('signature (apksig, schéma v2 : suffisant dès Android 7)');
const SIGNER = path.join(W, 'sign'); fs.mkdirSync(SIGNER);
fs.writeFileSync(path.join(SIGNER, 'Sign.java'), `
import com.android.apksig.*;
import java.io.*; import java.security.*; import java.security.cert.X509Certificate; import java.util.*;
public class Sign { public static void main(String[] a) throws Exception {
  KeyStore ks = KeyStore.getInstance("PKCS12"); try (InputStream in = new FileInputStream(a[2])) { ks.load(in, a[4].toCharArray()); }
  PrivateKey k = (PrivateKey) ks.getKey(a[3], a[4].toCharArray()); X509Certificate c = (X509Certificate) ks.getCertificate(a[3]);
  ApkSigner.SignerConfig sc = new ApkSigner.SignerConfig.Builder("FASCINAT", k, Collections.singletonList(c)).build();
  new ApkSigner.Builder(Collections.singletonList(sc)).setInputApk(new File(a[0])).setOutputApk(new File(a[1])).setMinSdkVersion(24).setV1SigningEnabled(false).setV2SigningEnabled(true).build().sign();
  ApkVerifier.Result r = new ApkVerifier.Builder(new File(a[1])).setMinCheckedPlatformVersion(24).build().verify();
  System.out.println("vérification : " + (r.isVerified() ? "valide" : "INVALIDE") + " · v1 " + r.isVerifiedUsingV1Scheme() + " · v2 " + r.isVerifiedUsingV2Scheme());
  for (ApkVerifier.IssueWithParams e : r.getErrors()) System.out.println("  erreur : " + e);
  if (!r.isVerified()) System.exit(1);
} }`);
run('javac', ['-nowarn', '-cp', jar.apksig, '-d', SIGNER, path.join(SIGNER, 'Sign.java')]);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
process.stdout.write(run('java', ['-Dstdout.encoding=UTF-8', '--add-exports=java.base/sun.security.x509=ALL-UNNAMED', '--add-exports=java.base/sun.security.pkcs=ALL-UNNAMED', '--add-exports=java.base/sun.security.util=ALL-UNNAMED', '-cp', `${jar.apksig}:${SIGNER}`, 'Sign', ALIGNED, OUT, KEY.file, KEY.alias, KEY.pass]));
run('python3', ['-I', path.join(ROOT, 'tools/zipalign.py'), '--check', OUT]);
log(`${path.relative(ROOT, OUT)} : ${(fs.statSync(OUT).size / 1048576).toFixed(2)} Mo`);
process.stdout.write(run(AAPT2, ['dump', 'badging', OUT]).split('\n').filter((l) => /^(package|minSdkVersion|sdkVersion|targetSdkVersion|application-label|launchable)/.test(l)).join('\n') + '\n');

function listJava(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listJava(path.join(d, e.name)) : e.name.endsWith('.java') ? [path.join(d, e.name)] : [])); }
// version : nombre de commits (croît à chaque construction depuis git), nom : 0.1.<n>
function commits() { try { return parseInt(run('git', ['-C', ROOT, 'rev-list', '--count', 'HEAD']).trim(), 10) || 1; } catch (e) { return 1; } }
function versionCode() { return commits(); }
function versionName() { return '0.1.' + commits(); }
