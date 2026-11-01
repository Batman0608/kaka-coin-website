/* Nạp Firebase một lần, dùng chung cho tài khoản người chơi và cửa hàng nạp hoa sen */
const CFG = (window.CBA && CBA.shop) || {};
const FB_VER = '10.12.2';
export const hasFirebase = !!(CFG.firebase && CFG.firebase.apiKey && CFG.firebase.projectId);
let P = null;
export function fb() {
  if (!hasFirebase) return Promise.reject(new Error('Chưa cấu hình Firebase'));
  return P || (P = (async () => {
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    const [appM, au, fs] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
    const app = appM.initializeApp(CFG.firebase), auth = au.getAuth(app), db = fs.getFirestore(app);
    await new Promise(res => { const off = au.onAuthStateChanged(auth, () => { off(); res(); }); });
    return { au, fs, auth, db };
  })());
}
