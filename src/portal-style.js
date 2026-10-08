export const PORTAL_CSS = String.raw`
:root{--navy:#071c2d;--navy2:#0c3049;--navy3:#15425e;--gold:#d29e43;--gold2:#f4d394;--sky:#e9f0f5;--paper:#f5f7fa;--panel:#fff;--line:#d5dfe7;--ink:#112b45;--muted:#688098;--danger:#c52d36;--warn:#f28c22;--good:#147659;--blue:#0b5799}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;font:13px/1.43 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:var(--ink);background:var(--sky)}
body{min-height:100vh}
button,input,select,textarea{font:inherit}button{cursor:pointer}
button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
[hidden]{display:none!important}
a{color:#0b4d83;text-decoration:none}a:hover{text-decoration:underline}
.shell{display:flex;min-height:100vh}
.sidebar{width:204px;flex:0 0 204px;background:linear-gradient(175deg,#06192b,#06283e 65%,#081e30);border-right:3px solid #bf954f;color:#e7f0f6;position:sticky;top:0;height:100vh;display:flex;flex-direction:column;z-index:20;box-shadow:5px 0 28px #09233626}
.logo{padding:15px 12px;min-height:90px;display:flex;flex-direction:row;gap:10px;align-items:center;justify-content:center;text-align:left;border-bottom:1px solid #365064}
.logo-shield{width:41px;height:47px;flex-shrink:0;display:grid;place-items:center;color:#e9b454;font:30px/1 Georgia,serif;background:linear-gradient(#15364d,#0a2134);border:2px solid #e0ab52;clip-path:polygon(50% 0%,100% 15%,100% 74%,50% 100%,0 74%,0 15%);margin-bottom:9px}
.logo strong{font:700 13px/1.3 "Segoe UI",Arial,sans-serif;letter-spacing:.06em}.logo small{display:none;font-size:9px;color:#f4d59c;letter-spacing:.09em;margin-top:6px}
.menu{padding:12px 9px;overflow:auto;flex:1;scrollbar-width:thin}
.menu-label{font-size:9px;color:#8ea8c0;letter-spacing:.15em;padding:11px 10px 7px;font-weight:800}
.nav{width:100%;text-align:left;display:flex;gap:10px;align-items:center;min-height:35px;margin:2px 0;padding:8px 9px;border-radius:7px;color:#e0eaf4;border:1px solid transparent;background:none;transition:.15s}
.nav:hover{background:#183b56}.nav.active{background:#24567c;border-color:#4a7290;border-left:3px solid var(--gold2);box-shadow:inset 0 1px #ffffff1a;font-weight:700}
.nav-icon{width:21px;text-align:center;font-size:15px;color:#d6e9f7}.nav.active .nav-icon{color:#ffd893}
.sidefoot{font-size:10px;color:#89a2b6;padding:13px;border-top:1px solid #2e4b61}
.workspace{flex:1;min-width:0}
.topbar{height:55px;position:sticky;top:0;z-index:15;display:flex;align-items:center;gap:15px;padding:0 22px;background:linear-gradient(100deg,#081f32,#0a2d43);color:#fff;border-bottom:3px solid #c8994d;box-shadow:0 5px 14px #0622381c}
.top-title{min-width:0;flex:1;font-weight:770;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.035em}.top-title small{font-weight:500;color:#bad0df;margin-left:8px}
.top-search{min-width:150px;width:clamp(180px,30vw,385px);padding:8px 12px;border:1px solid #31536b;border-radius:8px;background:#123c56;color:#f0f8ff}
.top-search::placeholder{color:#adc5d7}.top-btn{background:#193d56;color:#fff;border:1px solid #486780;border-radius:7px;padding:7px 10px}
.top-btn.gold{background:#d6a54f;color:#122d45;border-color:#f5d392;font-weight:800}
.hamburger{display:none}
.page{padding:19px 20px 60px;max-width:1690px;margin:0 auto}
.hero{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:15px}
.hero-title{font:750 25px/1.2 "Segoe UI",Arial,sans-serif;margin:0;color:#0d2b43}.hero-sub{margin:4px 0 0;color:#688398;font-size:12px}.overline{font-size:10px;font-weight:800;color:#a77e36;letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px}
.toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
.action{display:inline-flex;align-items:center;gap:6px;border-radius:6px;padding:8px 11px;background:#0d3652;color:#fff;border:1px solid #0d3652;font-weight:700}
.action:hover{background:#185275;color:#fff;text-decoration:none}.action.secondary{background:#fff;border-color:#c5d4e0;color:#0c3856}.action.gold{background:#dcac54;color:#172b3c;border-color:#dcac54}.action.red{background:#ba2732;border-color:#ba2732}
.input,.select{padding:9px 12px;border:1px solid #cbd6df;border-radius:6px;background:#fff;color:#123047;min-width:130px;max-width:100%}.input.search{min-width:260px;flex:1}
.card{background:var(--panel);border:1px solid #cfdae3;border-radius:8px;box-shadow:0 2px 10px #213b5110;min-width:0;overflow:hidden}
.card-head{background:#f7f9fc;color:#102f49;border-bottom:1px solid #e1e8ef;min-height:36px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 13px;font-weight:800;font-size:13px}
.card-head .minor{font-weight:500;color:#aec4d6;font-size:11px}
.card-body{padding:14px}
.stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:12px}
.stat{min-height:88px;justify-content:center;text-align:center;background:#fff;border:1px solid #d5dfe7;border-radius:8px;padding:13px 10px;display:flex;align-items:center;gap:10px;box-shadow:0 2px 5px #112e480d}
.stat-icon{display:none;font:26px/1 Georgia,serif;color:#0c3454;flex:0 0 34px;text-align:center}
.stat-value{font:750 clamp(23px,2.4vw,34px)/1 "Segoe UI",Arial,sans-serif;color:#0d2b4a;letter-spacing:-.035em}
.stat-value.red{color:#c61d28}.stat-value.gold{color:#b97f1e}
.stat-label{font-size:10px;color:#58718a;margin-top:7px;line-height:1.2}
.dashboard-cols{display:grid;grid-template-columns:1.04fr .95fr 1fr;gap:12px}.two-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}.span-2{grid-column:span 2}.span-3{grid-column:span 3}
.chart-rows{display:flex;align-items:center;gap:11px;margin:12px 0;font-size:12px}.chart-name{width:126px;flex:0 0 126px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700}.bar-rail{height:14px;border-radius:3px;background:#ebf0f4;flex:1;overflow:hidden}.bar-fill{height:100%;display:block;background:linear-gradient(90deg,#0b416f,#4381b9)}.bar-fill.gold{background:linear-gradient(90deg,#c39349,#e9c681)}.bar-fill.red{background:linear-gradient(90deg,#9f2330,#d45b5c)}.chart-val{font-weight:800;min-width:35px;text-align:right;font-variant-numeric:tabular-nums}
.donut-wrap{display:flex;gap:18px;align-items:center;min-height:210px}.donut{width:175px;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;position:relative;flex-shrink:0}.donut:after{content:"";position:absolute;background:#fff;inset:34px;border-radius:50%}.donut-label{z-index:1;position:relative;text-align:center;font:700 25px Georgia,serif}.donut-label small{display:block;font:11px system-ui;color:#7a90a2}.legend{flex:1;font-size:12px}.legend div{display:flex;justify-content:space-between;gap:10px;margin:9px 0}
.chip{display:inline-block;font-size:10px;padding:3px 8px;border-radius:4px;font-weight:750;background:#e5eef7;color:#144b72}.chip.red{background:#ffe2e2;color:#b9212d}.chip.amber{background:#fff0d9;color:#a2600c}.chip.green{background:#d8f3e7;color:#146c4c}.chip.navy{background:#dceaf3;color:#0a3556}
.candidate-note,.note{border-left:3px solid #c6994a;background:#fffaf0;padding:11px 13px;color:#63533d;font-size:12px;margin:10px 0;border-radius:2px}
.source-note{font-size:11px;color:#688098;margin:8px 0 14px}.source-note summary{cursor:pointer;font-weight:650}
.section-heading{font:750 18px "Segoe UI",Arial,sans-serif;color:#10304a;margin:3px 0 12px}
.table-scroll{max-width:100%;overflow:auto}.table{border-collapse:collapse;width:100%;font-size:11px;text-align:left;white-space:nowrap}
.table th{position:sticky;top:0;background:#e7eff6;color:#123c59;padding:9px;border-bottom:1px solid #becfdd;text-transform:uppercase;font-size:10px;letter-spacing:.035em}
.table td{padding:9px;border-bottom:1px solid #e4ecf1;max-width:310px;overflow:hidden;text-overflow:ellipsis}.table tbody tr{cursor:pointer}.table tbody tr:hover{background:#edf5fb}.table td.wrap{white-space:normal}
.row-title{font-weight:800;color:#0c3d67}
.pagination{padding:13px;display:flex;justify-content:center;gap:8px;align-items:center}
.pagination .action{padding:6px 12px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.office-card{cursor:pointer;border-radius:8px;border:1px solid #d7e0e9;background:#fff;overflow:hidden;min-height:190px;transition:.15s}
.office-card.selected{outline:3px solid #cb983d}.office-card:hover{box-shadow:0 5px 15px #0c344125}
.office-illustration{height:94px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;color:#f0d3a1;font:700 45px Georgia,serif;background:linear-gradient(140deg,#08263d,#164c68 65%,#08283a)}
.office-illustration:before{content:"⚖";font-size:95px;position:absolute;right:3px;top:-30px;color:#f1d3a21d}.office-card:nth-child(2) .office-illustration{background:linear-gradient(140deg,#43191e,#7c3031)}.office-card:nth-child(3) .office-illustration{background:linear-gradient(140deg,#22183b,#4b365f)}
.office-body{text-align:center;padding:13px}.office-body strong{font:700 25px Georgia,serif}.office-body small{display:block;color:#637a8d;margin:6px 0}
.person-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.person{border:1px solid #d6e0e9;border-radius:7px;background:#fff;text-align:left;padding:13px;cursor:pointer;display:flex;align-items:center;gap:12px;color:#163952}.person.selected{border-color:#c1933e;background:#fff9ec}.avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#dce8f1;color:#0b3859;font:700 20px Georgia,serif;flex:0 0 42px}.person strong{display:block}.person small{font-size:10px;color:#7890a3}
.document-layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:11px;margin-top:12px}
.doc-index{max-height:78vh;overflow:auto}.doc-choice{display:block;width:100%;text-align:left;padding:11px 12px;background:#fff;border:0;border-bottom:1px solid #e4ecf2;color:#153b56}.doc-choice:hover{background:#f1f7fb}.doc-choice.active{background:#e9f3fc;border-left:4px solid #c4974b;font-weight:750}.doc-choice small{display:block;color:#7893a6;font-weight:500;font-size:10px}
.doc-sheet{max-height:75vh;overflow:auto;background:#ebeff4;padding:18px}
.pdf-page{background:white;border:1px solid #d5dce5;max-width:920px;margin:0 auto 18px;padding:29px 24px 35px;box-shadow:0 5px 13px #263b5417;min-height:240px}
.pdf-page.has-visual{padding:0}.pdf-page.has-visual .page-number{margin:0;padding:10px 14px;background:#f8fafc;font-size:11px;border-bottom:1px solid #dde5ed}.page-visual{display:block;width:100%;height:auto}.page-transcript{padding:12px 16px}.page-transcript summary{cursor:pointer;color:#46657d}.filter-fields{display:flex;gap:12px;flex-wrap:wrap}.filter-fields label{display:flex;flex-direction:column;gap:4px;font-weight:650;font-size:11px}.filter-fields select{min-width:170px}
.pdf-page .page-number{font-weight:800;color:#b18a49;border-bottom:2px solid #d2b072;padding-bottom:8px;margin-bottom:16px}
.pdf-text{margin:0;font:11.3px/1.45 "Courier New",Consolas,monospace;color:#13263a;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4}
.doc-meta{padding:13px 15px;background:#fff;border-bottom:1px solid #dde5ec;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.doc-meta b{margin-right:auto}.doc-count{color:#7691a1;font-size:11px}
.placeholder{padding:35px 20px;text-align:center;color:#748b9d}
.chat-list{max-height:590px;overflow:auto}.chat-row{padding:12px;border-bottom:1px solid #e2ebf1;cursor:pointer}.chat-row:hover{background:#f4f8fc}.chat-row b{font-size:12px}.chat-row small{display:block;font-size:10px;color:#8197a8}.chat-bubble{background:#e6f2ff;border-radius:10px;padding:12px;white-space:pre-wrap}
.case-summary{background:#f1f7fc;border-left:3px solid #d6a34b;padding:14px}.issue{border-left:4px solid #c82e3a;background:#fff6f6;padding:11px;margin:9px 0;color:#213b50;white-space:pre-wrap}
.field{display:block;margin:11px 0 6px;font-weight:750;color:#19405c}
textarea{min-height:100px;resize:vertical;width:100%}
.toast{position:fixed;bottom:20px;right:20px;padding:12px 18px;border-radius:7px;background:#143952;color:#fff;box-shadow:0 10px 30px #041b303c;z-index:99;max-width:min(92vw,440px)}
.login-box{max-width:480px;margin:35px auto;padding:30px}.login-box .input{display:block;width:100%;margin:7px 0 15px}
#globalBusy{height:3px;background:linear-gradient(90deg,#d5ab63,#2a6d9a);animation:busy 1.2s ease infinite;position:fixed;top:0;left:0;width:100%;z-index:100}@keyframes busy{0%{opacity:.25}50%{opacity:1}100%{opacity:.25}}
.doc-coverage{font-size:11px;color:#687f96}
@media(max-width:1260px){.stats{grid-template-columns:repeat(3,minmax(0,1fr))}.dashboard-cols{grid-template-columns:1fr 1fr}.dashboard-cols>.card:last-child{grid-column:span 2}}
@media(max-width:890px){.sidebar{width:65px;flex-basis:65px}.logo{min-height:75px;padding:10px}.logo-shield{width:43px;height:49px;font-size:30px}.logo strong,.logo small,.menu-label,.nav-text,.sidefoot{display:none}.menu{padding:7px}.nav{justify-content:center;padding:10px 4px}.nav-icon{font-size:19px;width:auto}.top-title small{display:none}.topbar{gap:8px;padding:0 12px}.top-search{width:220px}.document-layout{grid-template-columns:205px minmax(0,1fr)}}
@media(max-width:650px){.sidebar{width:100%;height:auto;position:fixed;bottom:0;top:auto;border-right:0;border-top:2px solid var(--gold);flex-direction:row;z-index:50}.logo,.sidefoot,.menu-label{display:none}.menu{display:flex;overflow:auto;padding:4px;gap:2px;scrollbar-width:none;width:100%;height:60px}.nav{min-width:59px;display:flex;flex-direction:column;gap:0;margin:0;align-items:center;justify-content:center;padding:4px 2px;min-height:50px}.nav-icon{font-size:20px}.nav-text{display:block;font-size:8px;line-height:1.1;text-align:center;white-space:nowrap}.workspace{padding-bottom:62px}.topbar{height:54px}.top-search{max-width:130px;min-width:0}.top-title{font-size:11px}.top-btn{padding:6px}.page{padding:12px}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.stat{min-height:80px}.stat-value{font-size:26px}.dashboard-cols,.two-cols,.grid-3,.person-grid{grid-template-columns:1fr}.span-2,.span-3{grid-column:auto}.dashboard-cols>.card:last-child{grid-column:auto}.document-layout{grid-template-columns:1fr}.doc-index{display:flex;max-height:none;overflow:auto;white-space:nowrap}.doc-choice{min-width:154px;max-width:200px;white-space:normal}.doc-sheet{max-height:none;padding:9px}.pdf-page{padding:16px 12px}.pdf-text{font-size:10px}.hero{align-items:flex-start}.hero-title{font-size:22px}.donut-wrap{flex-direction:column}.top-search{display:none}}
`;