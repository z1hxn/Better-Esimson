(() => {
  "use strict";

  const isHomeworkPopup = location.pathname.toLowerCase() === "/popup/popup_homework_check.aspx";
  if ((window.top !== window && !isHomeworkPopup) || document.getElementById("better-esimson-toolbar")) return;

  const HOME_PATHS = new Set(["/", "/index.aspx", "/index.asp"]);
  const isHome = HOME_PATHS.has(location.pathname.toLowerCase());
  const isStudentDashboard = location.pathname.toLowerCase() === "/mypage/sub09_02.aspx";
  const isGradesPage = location.pathname.toLowerCase() === "/mypage/sub09_12.aspx";
  const isGradeDetailPage = location.pathname.toLowerCase() === "/mypage/sub09_12_view_mogosa.aspx";
  const isPointsPage = location.pathname.toLowerCase() === "/mypage/sub09_06.aspx";
  const isCounselListPage = location.pathname.toLowerCase() === "/mypage/sub09_04.aspx";
  const isCounselDetailPage = location.pathname.toLowerCase() === "/mypage/sub09_04_view.aspx";
  const isCounselWritePage = location.pathname.toLowerCase() === "/mypage/sub09_04_write.aspx";
  const isStudentPage = location.pathname.toLowerCase().startsWith("/mypage/");
  const isVocaHelperPage = new Set(["/exam/high_voca_start.aspx", "/exam/high_voca01_test.aspx", "/exam/high_voca02_test.aspx"]).has(location.pathname.toLowerCase());
  const MOCK_EXAM_PREVIEW = false;
  const hasModernPage = isHome || isStudentDashboard || isGradesPage || isGradeDetailPage || isPointsPage || isCounselListPage || isCounselDetailPage || isCounselWritePage || isHomeworkPopup;
  const supportsModernHeader = !isHomeworkPopup && !hasModernPage && Boolean(document.querySelector("#header .nav, #header .navi"));
  const supportsModernUi = hasModernPage || supportsModernHeader;
  const originalNodes = Array.from(document.body.children);
  const extensionIcon = chrome.runtime.getURL("icon.png");
  const textLogo = chrome.runtime.getURL("logo/text-logo.png");
  const state = {
    modern: supportsModernUi,
    menuOpen: false,
  };

  const clean = (value) => (value || "").replace(/\s+/g, " ").trim();
  function showToast(message, tone="success") {
    let region=document.getElementById("better-esimson-toasts");
    if(!region){ region=document.createElement("div"); region.id="better-esimson-toasts"; region.setAttribute("role","region"); region.setAttribute("aria-live","polite"); region.setAttribute("aria-label","Better Esimson 알림"); document.body.appendChild(region); }
    let toast=region.querySelector(".be-toast");
    if(!toast){
      toast=document.createElement("div");
      toast.innerHTML='<i aria-hidden="true">✓</i><span></span><button type="button" aria-label="알림 닫기">×</button>';
      region.replaceChildren(toast);
    }
    clearTimeout(region._beToastTimer);
    toast.className=`be-toast is-${tone}`;
    toast.querySelector("span").textContent=message;
    toast.classList.remove("is-visible");
    void toast.offsetWidth;
    const dismiss=()=>{ toast.classList.remove("is-visible"); };
    toast.querySelector("button").onclick=dismiss;
    requestAnimationFrame(()=>toast.classList.add("is-visible"));
    region._beToastTimer=setTimeout(dismiss,3200);
  }
  const absolute = (value) => {
    try { return new URL(value, location.href).href; } catch { return "#"; }
  };
  const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);
  const linkData = (node) => ({
    label: clean(node?.textContent) || clean(node?.querySelector("img")?.alt),
    href: absolute(node?.getAttribute("href") || "#"),
  });

  function readMockExam(doc = document, view = window) {
    const layer = doc.getElementById("mogosa");
    const anchor = layer?.querySelector("a");
    if (!layer || !anchor) return null;
    const inlineVisible = layer.style.display !== "none";
    let visible = inlineVisible;
    try {
      const style = view.getComputedStyle(layer);
      visible = style.display !== "none" && style.visibility !== "hidden";
    } catch {}
    if (!visible) return null;
    const source = `${anchor.getAttribute("onclick") || ""} ${anchor.getAttribute("href") || ""}`;
    const match = source.match(/MoGoSaGo2?\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    const href = anchor.getAttribute("href");
    const url = href && href !== "#" && !/^javascript:/i.test(href)
      ? absolute(href)
      : match ? absolute(`/exam/MogiSa_Begin.aspx?mpidx=${encodeURIComponent(match[1])}&examType=`) : "";
    return url ? { url, label: clean(anchor.querySelector("img")?.alt) || "모의고사 응시" } : null;
  }

  function mockExamButton(exam, className = "") {
    if (!exam?.url) return "";
    return `<a class="be-mock-exam ${className}" href="${escapeHtml(exam.url)}" target="_blank" rel="noopener"><span>응시 가능</span><strong>모의고사 응시</strong>${icon("arrow")}</a>`;
  }

  function readPage() {
    const navLabels = ["학원소개", "교육과정", "입학안내", "수강예약", "커뮤니티", "학사일정", "자료실", "마이페이지"];
    const nav = Array.from(document.querySelectorAll(".nav > .depth1 > li.gnb1")).slice(0, 8).map((group, index) => {
      const children = Array.from(group.querySelectorAll(":scope > .depth2 a")).map(linkData).filter((item) => item.label && item.href !== "#");
      const direct = group.querySelector(":scope > a");
      return { label: navLabels[index], href: index === 7 ? absolute("/mypage/sub09_02.aspx") : direct?.getAttribute("href") === "#" ? children[0]?.href || "#" : absolute(direct?.getAttribute("href")), children };
    });

    const list = (selector) => Array.from(document.querySelectorAll(`${selector} li > a`)).slice(0, 4).map(linkData).filter((item) => item.label);
    const userBox = document.querySelector("#login .my_box");
    const userName = clean(userBox?.querySelector("p")?.textContent).replace(/^[•\s]+/, "");
    const noticeCount = clean(userBox?.querySelector(".notice")?.textContent).replace(/\D/g, "") || "0";
    const point = clean(userBox?.querySelector(".point")?.textContent).replace(/\D/g, "") || "0";
    const campuses = Array.from(document.querySelectorAll(".left_link .linkBtn"))
      .map((node) => {
        const item = linkData(node);
        if (node.getAttribute("href") === "#") item.href = absolute(node.closest("li")?.querySelector(".linkBtn2")?.getAttribute("href") || "#");
        return { ...item, label: clean(node.textContent).replace(/마우스를 올려보세요\.?/g, "") };
      })
      .filter((item, index, all) => item.label && all.findIndex((other) => other.label === item.label) === index)
      .slice(0, 12);
    const month = clean(document.querySelector(".calendar_top li")?.textContent);

    return { nav, userName, noticeCount, point, campuses, month, notices: list("#notice_box2"), classes: list("#spc_box3"), events: list("#event_box2"), mockExam: readMockExam() };
  }

  const icon = (name) => ({
    arrow: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>'
    ,sidebar: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M17 9l-3 3 3 3"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg>',
    attendance: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    absence: '<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>',
    reexam: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
    pass: '<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.6 2.9 8.2 7 10 4.1-1.8 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>'
  })[name];

  function renderLinks(items, emptyText) {
    if (!items.length) return `<p class="be-empty">${escapeHtml(emptyText)}</p>`;
    return items.map((item) => `<a class="be-row" href="${escapeHtml(item.href)}"><span>${escapeHtml(item.label)}</span>${icon("arrow")}</a>`).join("");
  }

  function footerMarkup(extraClass="") {
    return `<footer class="be-footer ${extraClass}"><div class="be-footer-main"><div class="be-footer-intro"><a class="be-footer-wordmark" href="/index.aspx" aria-label="심슨어학원 홈"><strong>SIMSON</strong><span>LANGUAGE<br>INSTITUTE</span></a><h2>영어를 넘어 더 넓은 세상을 보는 힘</h2><p>Work Hard. No Short Cut.</p></div><nav class="be-footer-nav" aria-label="푸터 메뉴"><span>QUICK LINKS</span><div><a href="/academy/sub01_01.aspx">학원 소개</a><a href="/program/sub02_main.aspx">교육과정</a><a href="/admission/sub03_01.aspx">입학 안내</a><a href="/schedule/sub07_01.aspx">학사일정</a><a href="/community/sub05_01.aspx">공지사항</a><a href="/mypage/sub09_02.aspx">학생 시스템</a></div></nav><div class="be-footer-contact"><span>CONTACT</span><a href="tel:18553321">1855-3321</a><p>학원 등록과 수업에 관한 문의를 도와드립니다.</p><a class="be-footer-help" href="/community/sub05_02.aspx">온라인 문의 ${icon("arrow")}</a></div></div><div class="be-footer-business"><p><strong>(주)심슨교육</strong><span>대표 심호길</span><span>사업자등록번호 206-86-44236</span><span>서울특별시 광진구 아차산로 502</span></p><p><strong>(주)심슨파트너스</strong><span>사업자등록번호 631-81-00837</span><span>서울특별시 광진구 광나루로 604</span></p></div><div class="be-footer-bottom"><div><a href="/member/privacy.aspx">개인정보취급방침</a><a href="/member/termsofuse.aspx">이용약관</a><a href="http://blog.naver.com/hkshim" target="_blank" rel="noreferrer">블로그</a><a href="mailto:comjangii@naver.com">이메일 문의</a></div><small>© SIMSON LANGUAGE INSTITUTE. ALL RIGHTS RESERVED.</small></div></footer>`;
  }

  function renderHome(data) {
    const loggedIn = Boolean(data.userName);
    const root = document.createElement("div");
    root.id = "better-esimson-root";
    root.innerHTML = `
      <header class="be-header">
        <a class="be-brand" href="/index.aspx" aria-label="심슨어학원 홈"><img src="${textLogo}" alt="SIMSON Language Institute"></a>
        <nav class="be-nav" aria-label="주 메뉴">
          ${data.nav.map((item, index) => `<div class="be-nav-group"><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>${item.children.length ? `<div class="be-dropdown">${item.children.map((child) => `<a href="${escapeHtml(child.href)}">${escapeHtml(child.label)}</a>`).join("")}</div>` : ""}</div>`).join("")}
        </nav>
        <div class="be-header-actions"><a href="/community/sub05_02.aspx">문의하기</a><a class="be-primary-small" href="${loggedIn ? "/mypage/sub09_02.aspx" : "/member/step01.aspx"}">${loggedIn ? "학생 시스템" : "회원가입"}</a></div>
        <button class="be-mobile-menu" type="button" aria-label="메뉴 열기">${icon("grid")}</button>
      </header>
      <main>
        <section class="be-hero">
          <div class="be-hero-glow"></div>
          <div class="be-hero-copy"><span class="be-eyebrow">Simson Language Institute</span><h1>Work Hard.<br><em>No Short Cut.</em></h1><p>수험 영어를 넘어, 더 넓은 세상을 보는 힘을 기릅니다.</p><div class="be-hero-actions"><a class="be-button be-button-light" href="/program/sub02_main.aspx">교육과정 살펴보기 ${icon("arrow")}</a><a class="be-button be-button-ghost" href="/admission/sub03_01.aspx">입학 안내 ${icon("arrow")}</a></div></div>
          <div class="be-hero-number"><strong>20<sup>+</sup></strong><span>함께 성장해 온 시간</span></div>
        </section>
        <section class="be-quick">
          <a href="/booking/sub04_02.aspx"><span>01</span><strong>정규과정 예약</strong><small>수업 상담과 등록을 시작하세요</small>${icon("arrow")}</a>
          <a href="/booking/sub04_01.aspx"><span>02</span><strong>특강 예약</strong><small>시기에 맞는 특별 프로그램</small>${icon("arrow")}</a>
          <a href="/schedule/sub07_01.aspx"><span>03</span><strong>학사일정</strong><small>${escapeHtml(data.month || "이번 달")} 일정을 확인하세요</small>${icon("arrow")}</a>
          <a href="/dataroom/sub08_00.aspx"><span>04</span><strong>통합자료실</strong><small>학습에 필요한 자료를 한곳에서</small>${icon("arrow")}</a>
        </section>
        <section class="be-dashboard">
          <div class="be-feed">
            <div class="be-section-head"><div><span class="be-kicker">SIMSON UPDATE</span><h2>새로운 소식</h2></div><a href="/community/sub05_01.aspx">전체보기 ${icon("arrow")}</a></div>
            <div class="be-tabs" role="tablist"><button class="is-active" data-feed="notices">공지사항</button><button data-feed="classes">맞춤특강</button><button data-feed="events">심슨행사</button></div>
            <div class="be-feed-list" data-list="notices">${renderLinks(data.notices, "새 공지가 없습니다.")}</div>
            <div class="be-feed-list" data-list="classes" hidden>${renderLinks(data.classes, "진행 중인 맞춤특강이 없습니다.")}</div>
            <div class="be-feed-list" data-list="events" hidden>${renderLinks(data.events, "등록된 행사가 없습니다.")}</div>
          </div>
          <aside class="be-account ${loggedIn ? "is-user" : ""}">
            ${loggedIn ? `<span class="be-kicker">MY SIMSON</span><h2>${escapeHtml(data.userName)}</h2><p>오늘도 한 걸음 성장할 준비가 되었나요?</p><div class="be-stats"><a href="/mypage/sub09_01.aspx"><strong>${escapeHtml(data.noticeCount)}</strong><span>나의 공지</span></a><a href="/mypage/sub09_06.aspx"><strong>${escapeHtml(data.point)}</strong><span>포인트</span></a></div><div class="be-account-links"><a href="/mypage/sub09_02.aspx">과제 확인 ${icon("arrow")}</a><a href="/mypage/sub09_12.aspx">성적 조회 ${icon("arrow")}</a></div><button class="be-logout" type="button">로그아웃</button>${mockExamButton(data.mockExam, "be-mock-exam-home")}` : `<span class="be-kicker">MEMBER LOGIN</span><h2>다시 만나 반가워요</h2><p>로그인하고 과제, 성적, 포인트를 한눈에 확인하세요.</p><label>아이디<input id="be-user-id" type="text" autocomplete="username" placeholder="아이디를 입력하세요"></label><label>비밀번호<input id="be-user-pw" type="password" autocomplete="current-password" placeholder="비밀번호를 입력하세요"></label><button class="be-login" type="button">로그인</button><div class="be-login-links"><a href="/member/step01.aspx">회원가입</a><button class="be-find-account" type="button">ID/PW 찾기</button></div>`}
          </aside>
        </section>
        <section class="be-campus"><div class="be-section-head"><div><span class="be-kicker">OUR CAMPUS</span><h2>가까운 캠퍼스를 찾아보세요</h2></div><p>대표번호 <a href="tel:18553321">1855-3321</a></p></div><div class="be-campus-grid">${data.campuses.map((item) => `<a href="${escapeHtml(item.href)}"><span>${escapeHtml(item.label)}</span>${icon("arrow")}</a>`).join("")}</div></section>
      </main>
      ${footerMarkup()}`;
    document.body.appendChild(root);
    bindHome(root);
  }

  function renderLegacyModernHeader(data) {
    const legacyName=clean(document.querySelector("#login_box p b")?.textContent).replace(/학생$/,""), loggedIn=Boolean(legacyName||document.querySelector('#login_box a[href*="logout" i],#login_box [onclick*="logout" i]'));
    const header=document.createElement("div");
    header.className="be-legacy-modern-header";
    header.hidden=true;
    header.innerHTML=`<header class="be-header"><a class="be-brand" href="/index.aspx" aria-label="심슨어학원 홈"><img src="${textLogo}" alt="SIMSON Language Institute"></a><nav class="be-nav" aria-label="주 메뉴">${data.nav.map((item)=>`<div class="be-nav-group"><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>${item.children.length?`<div class="be-dropdown">${item.children.map((child)=>`<a href="${escapeHtml(child.href)}">${escapeHtml(child.label)}</a>`).join("")}</div>`:""}</div>`).join("")}</nav><div class="be-header-actions"><a href="/community/sub05_02.aspx">문의하기</a><a class="be-primary-small" href="${loggedIn?"/mypage/sub09_02.aspx":"/member/login.aspx"}">${loggedIn?(legacyName||"학생 시스템"):"로그인"}</a></div><button class="be-mobile-menu" type="button" aria-label="메뉴 열기">${icon("grid")}</button></header>`;
    (document.getElementById("wrapper")||document.body.firstElementChild)?.before(header);
    const footer=document.createElement("div"); footer.className="be-legacy-footer-host"; footer.hidden=true; footer.innerHTML=footerMarkup("be-legacy-modern-footer");
    const legacyFooter=document.getElementById("footer");
    if(legacyFooter)legacyFooter.before(footer); else document.body.appendChild(footer);
    header.querySelector(".be-mobile-menu")?.addEventListener("click",()=>header.querySelector(".be-nav")?.classList.toggle("is-open"));
  }

  function bindHome(root) {
    root.querySelectorAll(".be-tabs button").forEach((button) => button.addEventListener("click", () => {
      root.querySelectorAll(".be-tabs button").forEach((item) => item.classList.toggle("is-active", item === button));
      root.querySelectorAll(".be-feed-list").forEach((list) => { list.hidden = list.dataset.list !== button.dataset.feed; });
    }));
    root.querySelector(".be-mobile-menu")?.addEventListener("click", () => root.querySelector(".be-nav")?.classList.toggle("is-open"));
    root.querySelector(".be-login")?.addEventListener("click", submitLegacyLogin);
    root.querySelectorAll("#be-user-id, #be-user-pw").forEach((input) => input.addEventListener("keydown", (event) => { if (event.key === "Enter") submitLegacyLogin(); }));
    root.querySelector(".be-find-account")?.addEventListener("click", () => {
      const legacyLink = document.querySelector('a[href*="fancy_loginSearch"]');
      if (legacyLink) legacyLink.click(); else location.assign("/member/login.aspx");
    });
    root.querySelector(".be-logout")?.addEventListener("click", () => { if (confirm("로그아웃 하시겠습니까?")) location.assign("/logout.aspx"); });
  }

  const STUDENT_MENU_LABELS = [
    "나의 공지", "대시보드", "성적 조회", "수강료 & 교재관리", "포트폴리오",
    "학습계획서", "나의 포인트", "포인트 랭킹", "클래스정보", "반자료실 & 공지",
    "교실포토", "포인트쇼핑몰", "선생님 상담", "나의동영상", "개인정보 수정",
    "학생 개인기록카드", "SMS 내역", "My 보카", "내신 경향 분석 & 후기"
  ];

  function readStudentDashboard() {
    const menuAnchors = Array.from(document.querySelectorAll(".submenu > ul > li > a.roll"));
    const menu = STUDENT_MENU_LABELS.map((label, index) => ({ label, href: absolute(menuAnchors[index]?.getAttribute("href") || "#").replace(/\.aspx$/i, ".aspx") }));
    const select = document.getElementById("cmbstudent");
    const students = Array.from(select?.options || []).map((option) => ({ label: clean(option.textContent), value: option.value, selected: option.selected }));
    const rowsToObject = (selector) => Object.fromEntries(Array.from(document.querySelectorAll(`${selector} tr`)).map((row) => {
      const cells = row.querySelectorAll("th,td");
      return [clean(cells[0]?.textContent), clean(cells[1]?.textContent)];
    }).filter(([key]) => key));
    const classInfo = rowsToObject("#left_info .boardlisttable3");
    const studentInfo = rowsToObject("#right_info .boardlisttable3");
    const statRows = Array.from(document.querySelectorAll(".content_box .boardlisttable4 tr"));
    const stats = statRows.flatMap((row) => {
      const cells = Array.from(row.querySelectorAll("th,td"));
      const result = [];
      for (let index = 0; index < cells.length - 1; index += 2) result.push({ label: clean(cells[index].textContent), value: clean(cells[index + 1].textContent) });
      return result;
    });
    const calendarRows = Array.from(document.querySelectorAll("#howeview table tr")).slice(1).map((row) => Array.from(row.querySelectorAll(":scope > td")).map((cell) => {
      const raw = clean(cell.childNodes[0]?.textContent || cell.textContent);
      const day = (raw.match(/^\d{1,2}/) || [""])[0];
      const events = Array.from(cell.querySelectorAll("a")).map((anchor) => ({
        label: anchor.querySelector("img")?.alt === "재시통과여부" || anchor.title.includes("합격") ? "재시 통과" : "숙제 확인",
        title: clean(anchor.title.replace(/<br\s*\/?\s*>/gi, " · ").replace(/@/g, " — ")),
        href: anchor.getAttribute("href") || "#"
      }));
      if (cell.querySelector('img[alt="출석"]') && !events.some((event) => event.label === "출석")) events.push({ label: "출석", title: "출석 완료", href: "#" });
      return { day, events, today: cell.classList.contains("dayBefore") };
    }));
    const activeClass = clean(document.querySelector("#optban input:checked + label")?.textContent) || classInfo["반명"]?.split(" (")[0] || "수강반";
    const classOptions = Array.from(document.querySelectorAll('#optban input[type="radio"]')).map((input) => ({ value:input.value, label:clean(document.querySelector(`label[for="${input.id}"]`)?.textContent), selected:input.checked, id:input.id }));
    return {
      menu, students, classInfo, studentInfo, stats, calendarRows, activeClass, classOptions,
      year: document.getElementById("cmbyear")?.value || "",
      month: document.getElementById("cmbmonth")?.value || "",
      noticeCount: clean(document.querySelector("#login_box .Dp2")?.textContent) || "0",
      point: clean(document.querySelectorAll("#login_box .Dp2")[1]?.textContent) || "0",
      reexamText: clean(document.querySelector(".reexamTitle")?.textContent).replace(/\[\[|\]\]/g, ""),
    };
  }

  function renderStudentDashboard(data) {
    const root = document.createElement("div");
    root.id = "better-esimson-root";
    root.className = "be-student-root";
    const studentName = data.students.find((item) => item.selected)?.label || data.studentInfo["이름"] || "학생";
    const attendance = data.stats.find((item) => item.label === "출석")?.value || "-";
    const absence = data.stats.find((item) => item.label === "결석")?.value || "-";
    const reexam = data.stats.find((item) => item.label.includes("재시횟수"))?.value || "-";
    const pass = data.stats.find((item) => item.label.includes("합격횟수"))?.value || "-";
    const metricValue = (value) => (String(value).match(/[\d,.]+/) || [value])[0];
    const classValue = (key) => { const value=data.classInfo[key]||"-"; return key==="선생님"?value.replace(/\[(?:비)?담임\]/g,"").replace(/\(([^)]+)\)/g," · $1").replace(/\s*,\s*/g," / "):value; };
    root.innerHTML = `
      ${studentSidebar(data,1,studentName)}
      <div class="be-student-page">
        ${studentPageHeader("대시보드",data,studentName)}
        <main class="be-student-main be-dashboard-main">
          <section class="be-student-stats">
            <article><span class="be-stat-icon is-wine">${icon("attendance")}</span><div><small>${escapeHtml(data.month)}월 출석</small><strong>${escapeHtml(metricValue(attendance))}<em>회</em></strong></div></article>
            <article><span class="be-stat-icon">${icon("absence")}</span><div><small>${escapeHtml(data.month)}월 결석</small><strong>${escapeHtml(metricValue(absence))}<em>회</em></strong></div></article>
            <article><span class="be-stat-icon is-reexam">${icon("reexam")}</span><div><small>${escapeHtml(data.month)}월 재시</small><strong>${escapeHtml(metricValue(reexam))}<em>회</em></strong></div></article>
            <article><span class="be-stat-icon is-green">${icon("pass")}</span><div><small>재시 합격</small><strong>${escapeHtml(metricValue(pass))}<em>회</em></strong></div></article>
          </section>
          <section class="be-student-card be-calendar-card"><div class="be-calendar-toolbar"><div class="be-calendar-navigation"><button class="be-calendar-today" type="button">오늘</button><div class="be-calendar-step"><button data-calendar="prev" type="button" aria-label="이전 달">‹</button><button data-calendar="next" type="button" aria-label="다음 달">›</button></div><div class="be-calendar-title"><h2>${escapeHtml(data.year)}년 ${escapeHtml(String(Number(data.month)||data.month))}월</h2><span>학습 캘린더</span></div></div><div class="be-calendar-filter"><span>수강반</span><div class="be-calendar-classes" aria-label="수강반 선택">${data.classOptions.map((item) => `<button type="button" data-calendar-class="${escapeHtml(item.id)}" class="${item.selected?"is-active":""}">${escapeHtml(item.label)}</button>`).join("")}</div></div></div><div class="be-calendar"><div class="be-calendar-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>${data.calendarRows.map((week) => `<div class="be-calendar-week be-calendar-days">${week.map((day) => `<div class="${day.today ? "is-today" : ""}"><time>${escapeHtml(day.day)}</time>${day.events.map((event) => event.label.includes("재시 통과") || event.label === "출석" ? `<span title="${escapeHtml(event.title)}" class="${event.label === "출석" ? "is-attendance" : "is-pass"}">${escapeHtml(event.label)}</span>` : `<a href="${escapeHtml(event.href)}" title="${escapeHtml(event.title)}" class="is-homework">${escapeHtml(event.label)}</a>`).join("")}</div>`).join("")}</div>`).join("")}</div><div class="be-calendar-legend"><span><i class="is-attendance"></i>출석</span><span><i class="is-homework"></i>숙제 확인</span><span><i class="is-pass"></i>재시 통과</span></div></section>
          <div class="be-student-grid">
            <section class="be-student-card be-class-card"><div class="be-card-head"><div><span>CLASS INFORMATION</span><h2>수강 정보</h2></div><button class="be-info-toggle" type="button">학생 정보 보기</button></div><dl>${["관명","반명","수업요일","선생님","수강료"].map((key) => `<div><dt>${key}</dt><dd>${escapeHtml(classValue(key))}</dd></div>`).join("")}</dl><dl class="be-personal-info" hidden>${["이름","학교","학년","학원이동수단","학생휴대폰","학부모휴대폰"].map((key) => `<div><dt>${key}</dt><dd>${escapeHtml(data.studentInfo[key] || "-")}</dd></div>`).join("")}</dl></section>
            <section class="be-student-card be-today-card"><div class="be-card-head"><div><span>TODAY</span><h2>오늘의 재시</h2></div><button class="be-reexam-more" type="button">전체보기 ${icon("arrow")}</button></div><div class="be-today-empty"><span>✓</span><strong>${data.reexamText.includes("오늘재시없음") ? "오늘 예정된 재시가 없어요" : escapeHtml(data.reexamText)}</strong><p>오늘의 학습을 차근차근 완료해 보세요.</p></div></section>
          </div>
        </main>
      </div>`;
    document.body.appendChild(root);
    bindStudentDashboard(root);
  }

  function bindStudentDashboard(root) {
    bindStudentShell(root);
    root.querySelector(".be-info-toggle")?.addEventListener("click", (event) => {
      const info = root.querySelector(".be-personal-info");
      info.hidden = !info.hidden;
      event.currentTarget.textContent = info.hidden ? "학생 정보 보기" : "학생 정보 닫기";
    });
    root.querySelector(".be-reexam-more")?.addEventListener("click", () => document.querySelector('a[href*="Reexam_go"]')?.click());
    root.querySelector('[data-calendar="prev"]')?.addEventListener("click", () => document.getElementById("ImageButton1")?.click());
    root.querySelector('[data-calendar="next"]')?.addEventListener("click", () => document.getElementById("ImageButton2")?.click());
    root.querySelector(".be-calendar-today")?.addEventListener("click", () => location.reload());
    root.querySelectorAll("[data-calendar-class]").forEach((button)=>button.addEventListener("click",()=>document.getElementById(button.dataset.calendarClass)?.click()));
  }

  function studentSidebar(data, activeIndex, studentName) {
    const primaryIndexes = [1,2,6,12,4,17];
    const hiddenIndexes = new Set([...primaryIndexes,7,14]);
    const primary = primaryIndexes.map((index) => ({ ...data.menu[index], index }));
    const more = data.menu.map((item,index) => ({ ...item,index })).filter((item) => !hiddenIndexes.has(item.index));
    return `<aside class="be-student-sidebar"><nav aria-label="학생시스템 메뉴">${primary.map((item) => `<a href="${escapeHtml(item.href)}" class="${item.index === activeIndex ? "is-active" : ""}"><span>${escapeHtml(item.label)}</span>${icon("arrow")}</a>`).join("")}<button class="be-more-menu-trigger" type="button">${icon("grid")}<span>전체 메뉴</span>${icon("arrow")}</button></nav><button class="be-sidebar-close" type="button">${icon("sidebar")}<span>사이드바 접기</span></button><div class="be-more-menu" hidden><div><strong>전체 메뉴</strong><button class="be-more-menu-close" type="button" aria-label="닫기">${icon("close")}</button></div>${more.map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}${icon("arrow")}</a>`).join("")}</div></aside>`;
  }

  function studentPageHeader(title, data, studentName) {
    const privacyHref = data.menu[14]?.href || "/mypage/sub09_14.aspx";
    const reexam = data.stats?.find((item) => item.label.includes("재시횟수"))?.value || "0";
    return `<header class="be-student-header"><a class="be-student-header-logo" href="/mypage/sub09_02.aspx"><img src="${textLogo}" alt="학생시스템 대시보드"></a><button class="be-student-menu-toggle" type="button" aria-label="사이드바 열기">${icon("sidebar")}</button><nav class="be-header-metrics" aria-label="학생 현황"><a href="/mypage/sub09_01.aspx"><span>공지</span><b>${escapeHtml(data.noticeCount)}</b></a><a href="/mypage/sub09_06.aspx"><span>포인트</span><b>${escapeHtml(data.point)}</b></a><a href="/mypage/sub09_02.aspx"><span>재시</span><b>${escapeHtml(reexam)}</b></a></nav><div class="be-student-header-actions"><a class="be-student-exit" href="/index.aspx" aria-label="학생시스템 나가기"><span>학생시스템 나가기</span>${icon("arrow")}</a><button class="be-dark-toggle" type="button" aria-label="다크모드 전환" title="다크모드">◐</button><button class="be-header-user" type="button"><i>${escapeHtml(studentName.slice(0,1))}</i><strong>${escapeHtml(studentName)}</strong><span>${icon("chevron")}</span></button><div class="be-profile-menu" hidden><a href="${escapeHtml(privacyHref)}">개인정보 수정</a><button class="be-student-logout" type="button">로그아웃</button></div></div></header>`;
  }

  function bindStudentShell(root) {
    const pageNames = {
      "/mypage/sub09_02.aspx":["대시보드","Dashboard"],
      "/mypage/sub09_12.aspx":["성적 조회","Grades"],
      "/mypage/sub09_12_view_mogosa.aspx":["성적 상세","Grade Detail"],
      "/mypage/sub09_06.aspx":["나의 포인트","My Points"],
      "/mypage/sub09_04.aspx":["선생님 상담","Teacher Counsel"],
      "/mypage/sub09_04_view.aspx":["상담 상세","Counsel Detail"],
      "/mypage/sub09_04_write.aspx":["상담 작성","New Counsel"]
    };
    const main=root.querySelector(".be-student-main");
    if(main&&!main.querySelector(":scope > .be-page-title")){
      const [title,english]=pageNames[location.pathname.toLowerCase()]||[clean(root.querySelector(".be-student-sidebar .is-active")?.textContent)||"학생시스템","My Simson"];
      const intro=document.createElement("section"); intro.className="be-page-title"; intro.innerHTML=`<h1>${escapeHtml(title)}</h1><span>${escapeHtml(english)}</span>`;
      if(location.pathname.toLowerCase()==="/mypage/sub09_04_view.aspx") intro.insertAdjacentHTML("beforeend",`<div class="be-page-title-actions"><a href="/mypage/sub09_04.aspx">${icon("arrow")}<span>상담 목록</span></a></div>`);
      if(location.pathname.toLowerCase()==="/mypage/sub09_12_view_mogosa.aspx") intro.insertAdjacentHTML("beforeend",`<div class="be-page-title-actions"><a href="/mypage/sub09_12.aspx">${icon("arrow")}<span>성적 목록으로</span></a></div>`);
      main.prepend(intro);
      const welcome=main.querySelector(":scope > .be-student-welcome");
      if(welcome){ welcome.querySelector(":scope > div:first-child")?.remove(); welcome.querySelector("#be-student-select")?.closest("label")?.remove(); if(!welcome.children.length)welcome.remove(); else welcome.classList.add("be-page-controls"); }
    }
    const setSidebar = (visible) => { root.classList.toggle("is-sidebar-hidden", !visible); root.querySelector(".be-student-sidebar")?.classList.toggle("is-open", visible); };
    chrome.storage.local.get("studentSidebarVisible", ({ studentSidebarVisible }) => setSidebar(studentSidebarVisible !== false));
    root.querySelector(".be-student-menu-toggle")?.addEventListener("click", () => { setSidebar(true); chrome.storage.local.set({ studentSidebarVisible:true }); });
    root.querySelector(".be-sidebar-close")?.addEventListener("click", () => { setSidebar(false); chrome.storage.local.set({ studentSidebarVisible:false }); });
    root.querySelector(".be-student-logout")?.addEventListener("click", () => { if (confirm("로그아웃 하시겠습니까?")) location.assign("/logout.aspx"); });
    const moreMenu = root.querySelector(".be-more-menu");
    root.querySelector(".be-more-menu-trigger")?.addEventListener("click", () => { if (moreMenu) moreMenu.hidden = false; });
    root.querySelector(".be-more-menu-close")?.addEventListener("click", () => { if (moreMenu) moreMenu.hidden = true; });
    const profileMenu = root.querySelector(".be-profile-menu");
    root.querySelector(".be-header-user")?.addEventListener("click", () => { if (profileMenu) profileMenu.hidden = !profileMenu.hidden; });
    const setDark = (enabled) => { root.classList.toggle("is-dark", enabled); document.documentElement.classList.toggle("be-student-dark", enabled); };
    chrome.storage.local.get("studentDarkMode", ({ studentDarkMode }) => setDark(studentDarkMode === true));
    root.querySelector(".be-dark-toggle")?.addEventListener("click", () => { const enabled=!root.classList.contains("is-dark"); setDark(enabled); chrome.storage.local.set({ studentDarkMode:enabled }); });
    if (isStudentDashboard) detectMockExamForStudent(root);
  }

  function detectMockExamForStudent(root) {
    const stats = root.querySelector(".be-student-stats");
    if (!stats) return;
    if (MOCK_EXAM_PREVIEW && !root.querySelector(".be-mock-exam-dashboard")) {
      stats.insertAdjacentHTML("beforebegin", `<button class="be-mock-exam be-mock-exam-dashboard is-preview" type="button" title="모의고사 버튼 테스트 미리보기"><span><small>테스트 미리보기</small><strong>iBT 모의고사</strong></span><em>응시하기</em>${icon("arrow")}</button>`);
    }
    const frame = document.createElement("iframe");
    frame.className = "be-mock-exam-probe";
    frame.src = `/index.aspx?betterEsimsonProbe=${Date.now()}`;
    frame.setAttribute("aria-hidden", "true");
    let done = false;
    const finish = (exam) => {
      if (done) return;
      done = true;
      if (exam) {
        root.querySelector(".be-mock-exam-dashboard.is-preview")?.remove();
        stats.insertAdjacentHTML("beforebegin", `<a class="be-mock-exam be-mock-exam-dashboard" href="${escapeHtml(exam.url)}" target="_blank" rel="noopener"><span><small>WEEKLY TEST</small><strong>iBT 모의고사</strong></span><em>응시하기</em>${icon("arrow")}</a>`);
      }
      frame.remove();
    };
    const timeout = window.setTimeout(() => finish(null), 10000);
    frame.addEventListener("load", () => {
      let attempts = 0;
      const inspect = () => {
        attempts += 1;
        let exam = null;
        try { exam = readMockExam(frame.contentDocument, frame.contentWindow); } catch {}
        if (exam || attempts >= 40) {
          window.clearTimeout(timeout);
          finish(exam);
        } else window.setTimeout(inspect, 250);
      };
      inspect();
    }, { once: true });
    document.body.appendChild(frame);
  }

  function readGrades() {
    const base = readStudentDashboard();
    const yearSelect = document.getElementById("cmbyear");
    const years = Array.from(yearSelect?.options || []).map((option) => ({ label:clean(option.textContent), value:option.value, selected:option.selected }));
    const table = Array.from(document.querySelectorAll(".boardlisttable6 table")).find((item) => clean(item.querySelector("th")?.textContent) === "시험명");
    const exams = Array.from(table?.querySelectorAll("tr") || []).slice(1).map((row) => {
      const cells = Array.from(row.querySelectorAll(":scope > td"));
      if (cells.length < 8) return null;
      const detail = cells[7].querySelector("a");
      return { name: cells[0].querySelector("a")?.title || clean(cells[0].textContent), date: clean(cells[1].textContent), score: clean(cells[2].textContent), totalAvg: clean(cells[3].textContent), classAvg: clean(cells[4].textContent), gradeAvg: clean(cells[5].textContent), rank: clean(cells[6].textContent), href: absolute(detail?.getAttribute("href") || "#") };
    }).filter(Boolean);
    return { ...base, exams, years };
  }

  function renderGrades(data) {
    const root = document.createElement("div");
    root.id = "better-esimson-root"; root.className = "be-student-root";
    const studentName = data.students.find((item) => item.selected)?.label || "학생";
    const scores = data.exams.map((item) => Number.parseFloat(item.score)).filter(Number.isFinite);
    const latest = data.exams[0];
    const average = scores.length ? (scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1) : "-";
    const best = data.exams.reduce((result, item) => !result || Number.parseInt(item.rank) < Number.parseInt(result.rank) ? item : result, null);
    root.innerHTML = `${studentSidebar(data,2,studentName)}<div class="be-student-page">${studentPageHeader("성적조회",data,studentName)}<main class="be-student-main"><section class="be-student-welcome"><div><span class="be-kicker">ACADEMIC PERFORMANCE</span><h1>${escapeHtml(studentName)} 학생의 성적</h1><p>최근 시험 결과와 평균, 석차 변화를 확인하세요.</p></div><div class="be-grade-filters"><label>학생 선택<select id="be-student-select">${data.students.map((item) => `<option value="${escapeHtml(item.value)}" ${item.selected ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label><label>조회 연도<select id="be-grade-year">${data.years.map((item) => `<option value="${escapeHtml(item.value)}" ${item.selected ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label><button class="be-grade-search" type="button">조회</button></div></section><section class="be-grade-summary"><article class="is-primary"><small>최근 시험 점수</small><strong>${escapeHtml(latest?.score || "-")}</strong><span>${escapeHtml(latest?.date || "응시 기록 없음")}</span></article><article><small>전체 시험 평균</small><strong>${escapeHtml(average)}점</strong><span>${scores.length}개 시험 기준</span></article><article><small>최고 석차</small><strong>${escapeHtml(best?.rank || "-")}</strong><span>${escapeHtml(best?.name || "응시 기록 없음")}</span></article></section><section class="be-student-card be-score-chart"><div class="be-card-head"><div><span>SCORE TREND</span><h2>최근 성적 추이</h2></div><small>최근 10회</small></div><div class="be-score-bars">${data.exams.slice(0,10).reverse().map((exam) => { const value=Math.min(100,Number.parseFloat(exam.score)||0); return `<div><span style="height:${value}%"><b>${escapeHtml(exam.score)}</b></span><small>${escapeHtml(exam.date.slice(5))}</small></div>`; }).join("")}</div></section><section class="be-student-card be-record-card"><div class="be-card-head"><div><span>EXAM HISTORY</span><h2>시험별 성적</h2></div><span>총 ${data.exams.length}건</span></div><div class="be-modern-table"><div class="be-table-row be-table-head"><span>시험명</span><span>응시일</span><span>내 점수</span><span>반 평균</span><span>전체 석차</span></div>${data.exams.map((exam) => { const highScore=(Number.parseFloat(exam.score)||0)>=90; return `<button class="be-table-row be-grade-detail" type="button" data-href="${escapeHtml(exam.href)}"><strong>${escapeHtml(exam.name)}</strong><span>${escapeHtml(exam.date)}</span><b class="${highScore?"is-high-score":""}">${escapeHtml(exam.score)}</b><span>${escapeHtml(exam.classAvg)}</span><span>${escapeHtml(exam.rank)}</span></button>`; }).join("")}</div></section></main></div>`;
    document.body.appendChild(root); bindStudentShell(root);
    root.querySelector(".be-grade-search")?.addEventListener("click", () => {
      const year = document.getElementById("cmbyear"); if (year) year.value = root.querySelector("#be-grade-year")?.value;
      document.getElementById("imgSearch")?.click();
    });
    root.querySelectorAll(".be-grade-detail").forEach((button) => button.addEventListener("click", () => location.assign(button.dataset.href)));
  }

  function readGradeDetail() {
    const base = readStudentDashboard();
    const rows = Array.from(document.querySelectorAll(".exam_box .boardlisttable6 > table > tbody > tr, .exam_box .boardlisttable6 > table > tr"));
    const subjects = rows.slice(1).map((row) => {
      const cells=Array.from(row.querySelectorAll(":scope > th,:scope > td"));
      return cells.length>=2 ? { label:clean(cells[0].textContent), score:clean(cells[1].textContent), average:clean(cells[2]?.textContent) } : null;
    }).filter(Boolean);
    const comparisonTable = document.querySelector(".wronglisttable table");
    const compRows = Array.from(comparisonTable?.querySelectorAll("tr") || []);
    const headers = Array.from(compRows[0]?.querySelectorAll("th,td") || []).map((cell)=>clean(cell.textContent));
    const ranks = Array.from(compRows[1]?.querySelectorAll("th,td") || []).map((cell)=>clean(cell.textContent));
    const scores = Array.from(compRows[2]?.querySelectorAll("th,td") || []).map((cell)=>clean(cell.textContent));
    const comparisons = headers.map((label,index)=>({ label,rank:ranks[index]||"-",score:scores[index]||"-" }));
    const questions = Array.from(document.querySelectorAll(".percentlisttable tbody tr")).map((row)=>{
      const cells=Array.from(row.querySelectorAll(":scope > td"));
      return cells.length>=4 ? { number:clean(cells[0].textContent),type:clean(cells[1].textContent),result:clean(cells[2].textContent),wrongRate:clean(cells[3].textContent) } : null;
    }).filter(Boolean);
    const noteQuestionHtml = document.querySelector("#tab4 .boardlisttable6")?.innerHTML || "";
    const noteAnswerHtml = document.querySelector("#tab5 .boardlisttable6")?.innerHTML || "";
    const loginName = clean(document.querySelector("#login_box b")?.textContent).replace(/학생$/,"") || "학생";
    return { ...base, title:clean(document.getElementById("spnTitle")?.textContent), subjects, comparisons, questions, noteQuestionHtml, noteAnswerHtml, studentName:loginName };
  }

  function renderGradeDetail(data) {
    const root=document.createElement("div"); root.id="better-esimson-root"; root.className="be-student-root";
    const total=data.subjects.find((item)=>item.label.includes("총점"));
    const rank=data.subjects.find((item)=>item.label.includes("석차"));
    const wrong=data.questions.filter((item)=>item.result.toUpperCase()==="X");
    root.innerHTML=`${studentSidebar(data,2,data.studentName)}<div class="be-student-page">${studentPageHeader("성적 상세",data,data.studentName)}<main class="be-student-main be-grade-detail-page"><section class="be-detail-title"><div><a class="be-back-link" href="/mypage/sub09_12.aspx">${icon("arrow")}<span>성적 목록으로</span></a><span class="be-kicker">EXAM REPORT</span><h1>${escapeHtml(data.title||"시험 성적 상세")}</h1></div><div class="be-detail-total"><small>총점 / 평균</small><strong>${escapeHtml(total?.score||"-")}</strong><span>전체 석차 ${escapeHtml(rank?.score||"-")}</span></div></section><section class="be-subject-cards">${data.subjects.filter((item)=>!["총점/평균","석차"].includes(item.label)).map((item)=>`<article><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.score)}</strong><small>평균 ${escapeHtml(item.average||"-")}</small></article>`).join("")}</section><section class="be-detail-comparison">${data.comparisons.map((item)=>`<article><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.rank)}</strong><span>${escapeHtml(item.score)}</span></article>`).join("")}</section><div class="be-detail-grid"><section class="be-student-card"><div class="be-card-head"><div><span>ANSWER SHEET</span><h2>문항별 결과</h2></div><small>${data.questions.length-wrong.length}개 정답 · ${wrong.length}개 오답</small></div><div class="be-answer-grid">${data.questions.map((item)=>`<button type="button" class="${item.result.toUpperCase()==="X"?"is-wrong":"is-correct"}" data-question-type="${escapeHtml(item.type)}"><b>${escapeHtml(item.number)}</b><span>${escapeHtml(item.result)}</span><small>${escapeHtml(item.wrongRate)}</small></button>`).join("")}</div></section><section class="be-student-card be-wrong-card"><div class="be-card-head"><div><span>REVIEW</span><h2>틀린 문항</h2></div></div>${wrong.length?wrong.map((item)=>`<div><b>${escapeHtml(item.number)}번</b><span>${escapeHtml(item.type)}</span><em>오답률 ${escapeHtml(item.wrongRate)}</em></div>`).join(""):`<p>모든 문항을 맞혔습니다.</p>`}</section></div>${data.noteQuestionHtml||data.noteAnswerHtml?`<section class="be-student-card be-study-note"><div class="be-card-head"><div><span>STUDY NOTE</span><h2>자주장 분석 노트</h2></div><div class="be-note-tabs"><button class="is-active" type="button" data-note="question">문제지</button><button type="button" data-note="answer">정답 · 해설</button></div></div><div class="be-note-paper" data-note-panel="question">${data.noteQuestionHtml||"<p>등록된 문제지가 없습니다.</p>"}</div><div class="be-note-paper" data-note-panel="answer" hidden>${data.noteAnswerHtml||"<p>등록된 해설이 없습니다.</p>"}</div></section>`:""}</main></div>`;
    document.body.appendChild(root); bindStudentShell(root);
    root.querySelectorAll(".be-note-tabs button").forEach((button)=>button.addEventListener("click",()=>{
      root.querySelectorAll(".be-note-tabs button").forEach((item)=>item.classList.toggle("is-active",item===button));
      root.querySelectorAll("[data-note-panel]").forEach((panel)=>{ panel.hidden=panel.dataset.notePanel!==button.dataset.note; });
    }));
  }

  function readPoints() {
    const base = readStudentDashboard();
    const pointBox = clean(document.getElementById("point_box")?.textContent);
    const total = (pointBox.match(/총 포인트는\s*(-?\d+)/) || pointBox.match(/(-?\d+)\s*점/) || [,"0"])[1];
    const table = document.querySelector(".boardlisttable5 table");
    const entries = Array.from(table?.querySelectorAll("tr") || []).slice(1).map((row) => {
      const cells = Array.from(row.querySelectorAll(":scope > td"));
      return cells.length >= 5 ? { id:clean(cells[0].textContent), amount:clean(cells[1].textContent), type:clean(cells[2].textContent), author:clean(cells[3].textContent), date:clean(cells[4].textContent) } : null;
    }).filter(Boolean);
    const shopText = clean(document.querySelector("#rightContent > .content_box")?.textContent);
    const products = (shopText.match(/(\d+)\s*개의 상품/) || [,"0"])[1];
    const pager = document.getElementById("pagingHelper");
    const currentPage = clean(pager?.querySelector("font")?.textContent) || "1";
    const totalRecords = (clean(document.getElementById("board_page")?.textContent).match(/검색수\s*:\s*(\d+)/) || [,String(entries.length)])[1];
    const pages = Array.from(pager?.querySelectorAll("a") || []).map((anchor,index) => ({ index, label:clean(anchor.textContent) || (anchor.querySelector("img")?.src.includes("next_end") ? "끝" : "다음") }));
    return { ...base, total, entries, products, currentPage, pages, totalRecords };
  }

  function renderPoints(data) {
    const root = document.createElement("div");
    root.id = "better-esimson-root"; root.className = "be-student-root";
    const studentName = data.students.find((item) => item.selected)?.label || "학생";
    const earned = data.entries.filter((item) => Number(item.amount)>0).reduce((sum,item)=>sum+Number(item.amount),0);
    const used = Math.abs(data.entries.filter((item) => Number(item.amount)<0).reduce((sum,item)=>sum+Number(item.amount),0));
    root.innerHTML = `${studentSidebar(data,6,studentName)}<div class="be-student-page">${studentPageHeader("나의포인트",data,studentName)}<main class="be-student-main"><section class="be-student-welcome"><div><span class="be-kicker">MY POINTS</span><h1>${escapeHtml(studentName)} 학생의 포인트</h1><p>학습으로 모은 포인트와 사용 내역을 확인하세요.</p></div><label>학생 선택<select id="be-student-select">${data.students.map((item) => `<option value="${escapeHtml(item.value)}" ${item.selected ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label></section><section class="be-point-hero"><div><small>사용 가능한 포인트</small><strong>${Number(data.total).toLocaleString()}<em>P</em></strong><p>꾸준한 학습으로 포인트를 더 모아보세요.</p></div><a href="${escapeHtml(data.menu[7]?.href||"/mypage/sub09_11.aspx")}">포인트 랭킹 ${icon("arrow")}</a></section><section class="be-point-summary"><article><span>+</span><div><small>최근 적립</small><strong>${earned.toLocaleString()}P</strong></div></article><article><span>−</span><div><small>최근 사용·차감</small><strong>${used.toLocaleString()}P</strong></div></article><article><span>▣</span><div><small>구매 가능한 상품</small><strong>${escapeHtml(data.products)}개</strong></div></article></section><section class="be-student-card be-record-card"><div class="be-card-head"><div><span>POINT HISTORY</span><h2>포인트 내역</h2></div><span>${escapeHtml(data.totalRecords)}개의 전체 기록</span></div><div class="be-modern-table be-point-table"><div class="be-table-row be-table-head"><span>유형</span><span>포인트</span><span>작성자</span><span>등록일</span></div>${data.entries.map((entry) => `<div class="be-table-row"><strong>${escapeHtml(entry.type)}</strong><b class="${Number(entry.amount)<0 ? "is-minus" : "is-plus"}">${Number(entry.amount)>0?"+":""}${escapeHtml(entry.amount)}P</b><span>${escapeHtml(entry.author)}</span><span>${escapeHtml(entry.date)}</span></div>`).join("")}</div><nav class="be-pagination" aria-label="포인트 내역 페이지"><b>${escapeHtml(data.currentPage)}</b>${data.pages.map((page) => `<button type="button" disabled title="원본 HTML에 포함되지 않은 내역은 불러올 수 없습니다">${escapeHtml(page.label)}</button>`).join("")}</nav>${data.pages.length ? `<p class="be-pagination-note">현재 불러온 HTML에 포함된 내역만 표시됩니다. 다른 페이지로는 이동할 수 없습니다.</p>` : ""}</section></main></div>`;
    document.body.appendChild(root); bindStudentShell(root);
  }

  function counselShell(data, studentName, content) {
    return `${studentSidebar(data,12,studentName)}<div class="be-student-page">${studentPageHeader("선생님 상담",data,studentName)}<main class="be-student-main be-counsel-page">${content}</main></div>`;
  }

  function readCounselList() {
    const base=readStudentDashboard();
    const table=document.querySelector("#rightContent .boardlisttable5 table");
    const items=Array.from(table?.querySelectorAll("tr")||[]).slice(1).map((row)=>{ const cells=Array.from(row.querySelectorAll(":scope > td")); const link=cells[2]?.querySelector("a"); return cells.length>=5?{ number:clean(cells[0].textContent),type:clean(cells[1].textContent),title:clean(link?.textContent),href:absolute(link?.getAttribute("href")||"#"),author:clean(cells[3].textContent),date:clean(cells[4].textContent),answered:Boolean(cells[2].querySelector('img[alt="답변완료"]'))}:null; }).filter(Boolean);
    const studentName=base.students.find((item)=>item.selected)?.label||items[0]?.author||"학생";
    return {...base,items,studentName};
  }

  function renderCounselList(data) {
    const root=document.createElement("div"); root.id="better-esimson-root"; root.className="be-student-root"; const answered=data.items.filter((item)=>item.answered).length;
    root.innerHTML=counselShell(data,data.studentName,`<section class="be-student-welcome"><div><span class="be-kicker">TEACHER COUNSEL</span><h1>선생님 상담</h1><p>수업과 학습에 관한 궁금한 점을 담당 선생님께 남겨보세요.</p></div><a class="be-counsel-write" href="/mypage/sub09_04_write.aspx">새 상담 작성 ${icon("arrow")}</a></section><section class="be-counsel-summary"><article><small>전체 상담</small><strong>${data.items.length}</strong><span>현재 페이지 기준</span></article><article><small>답변 완료</small><strong>${answered}</strong><span>선생님 답변이 도착했어요</span></article><article><small>답변 대기</small><strong>${data.items.length-answered}</strong><span>확인 중인 상담</span></article></section><section class="be-student-card be-counsel-list"><div class="be-card-head"><div><span>COUNSEL HISTORY</span><h2>상담 내역</h2></div><small>최근 상담부터 표시됩니다</small></div>${data.items.length?data.items.map((item)=>`<a href="${escapeHtml(item.href)}"><span class="be-counsel-type">${escapeHtml(item.type)}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.author)} · ${escapeHtml(item.date)}</small></div><em class="${item.answered?"is-complete":""}">${item.answered?"답변 완료":"답변 대기"}</em>${icon("arrow")}</a>`).join(""):`<div class="be-counsel-empty"><strong>아직 상담 내역이 없습니다.</strong><p>궁금한 내용을 선생님께 남겨보세요.</p></div>`}</section>`);
    document.body.appendChild(root); bindStudentShell(root);
  }

  function readCounselDetail() {
    const base=readStudentDashboard(); const tables=Array.from(document.querySelectorAll("#rightContent .boardlisttable5 table"));
    const readBlock=(table)=>{ const heads=Array.from(table?.querySelectorAll("tr:first-child th")||[]).map((cell)=>clean(cell.textContent)); const heading=heads.join(" "); const box=table?.querySelector(".c_box"); const attachments=Array.from(box?.querySelectorAll('a[href]')||[]).map((link)=>{ const href=absolute(link.getAttribute("href")); const fallback=decodeURIComponent(new URL(href).pathname.split("/").pop()||"첨부파일"); return {name:clean(link.textContent)||link.getAttribute("download")||fallback,href}; }).filter((item)=>item.href!=="#"); const clone=box?.cloneNode(true); clone?.querySelectorAll('a[href]').forEach((link)=>link.remove()); let content=clean(clone?.textContent).replace(/선생님준 화일\s*:\s*/g,"").replace(/학생전송 화일\s*:\s*/g,""); attachments.forEach((file)=>{ content=content.replace(file.name,"").trim(); }); return {heading,time:heads[1]?.match(/\d{4}-\d{2}-\d{2}.*$/)?.[0]||heading.match(/\d{4}-\d{2}-\d{2}(?:\s|\S)*?\d{1,2}:\d{2}(?::\d{1,2})?/)?.[0]||"",content,attachments}; };
    const studentName=base.students.find((item)=>item.selected)?.label||clean(document.querySelector("#login_box b")?.textContent).replace(/학생$/,"")||"학생";
    const question=readBlock(tables[0]); const answer=readBlock(tables[1]); const teacherName=((answer.heading.match(/답변\s*:\s*([^\d]+?)\s*선생님의\s*답변/)||answer.heading.match(/([^\d:]+?)\s*선생님의\s*답변/)||[])[1]||"").replace(/^.*답변완료\s*/,"").trim()||"담당 선생님";
    return {...base,studentName,teacherName,question,answer,attachments:[...question.attachments,...answer.attachments],answered:Boolean(tables[1])};
  }

  function renderCounselDetail(data) {
    const root=document.createElement("div"); root.id="better-esimson-root"; root.className="be-student-root";
    root.innerHTML=counselShell(data,data.studentName,`<section class="be-counsel-detail-head"><a href="/mypage/sub09_04.aspx">${icon("arrow")} 상담 목록</a><span class="be-kicker">COUNSEL DETAIL</span><h1>선생님 상담</h1><span class="be-status-badge ${data.answered?"is-complete":""}">${data.answered?"답변 완료":"답변 대기"}</span></section><section class="be-student-card be-counsel-thread"><article class="is-student"><header><div class="be-counsel-person"><i>${escapeHtml(data.studentName.slice(0,1))}</i><strong>${escapeHtml(data.studentName)}</strong></div>${data.question.time?`<time>${escapeHtml(data.question.time)}</time>`:""}</header><p>${escapeHtml(data.question.content)}</p></article>${data.answered?`<article class="is-teacher"><header><div class="be-counsel-person"><i>${escapeHtml(data.teacherName.slice(0,1))}</i><strong>${escapeHtml(data.teacherName)} 선생님</strong></div>${data.answer.time?`<time>${escapeHtml(data.answer.time)}</time>`:""}</header><p>${escapeHtml(data.answer.content)}</p>${data.attachments.length?`<div class="be-counsel-files"><span>첨부파일</span>${data.attachments.map((file)=>`<a href="${escapeHtml(file.href)}" download>${icon("download")}<strong>${escapeHtml(file.name)}</strong><small>다운로드</small></a>`).join("")}</div>`:""}</article>`:`<div class="be-counsel-waiting"><strong>선생님의 답변을 기다리고 있어요.</strong><p>답변이 등록되면 이곳에서 확인할 수 있습니다.</p></div>`}</section><div class="be-counsel-detail-actions"><a href="/mypage/sub09_04_write.aspx${location.search}">추가 문의</a><a href="/mypage/sub09_04.aspx">목록으로</a></div>`);
    document.body.appendChild(root); bindStudentShell(root);
  }

  function readCounselWrite() {
    const base=readStudentDashboard();
    const teachers=Array.from(document.querySelectorAll('#rptContentList input[name="optteacher"]')).map((input)=>{ const card=input.closest("table"); return {value:input.value,name:clean(input.parentElement?.textContent).replace(/선생님$/,"").trim(),subject:clean(card?.querySelector("a.paran")?.textContent).replace(/^과목:/,""),image:absolute(card?.querySelector("img")?.getAttribute("src")||"")}; });
    const kinds=Array.from(document.querySelectorAll("#cmbkind option")).filter((option)=>option.value).map((option)=>({value:option.value,label:clean(option.textContent)}));
    return {...base,teachers,kinds,studentName:base.students.find((item)=>item.selected)?.label||"학생"};
  }

  function renderCounselWrite(data) {
    const root=document.createElement("div"); root.id="better-esimson-root"; root.className="be-student-root";
    root.innerHTML=counselShell(data,data.studentName,`<section class="be-student-welcome"><div><span class="be-kicker">NEW COUNSEL</span><h1>새 상담 작성</h1><p>상담할 선생님과 유형을 선택하고 내용을 작성해 주세요.</p></div><a class="be-counsel-list-link" href="/mypage/sub09_04.aspx">상담 목록</a></section><section class="be-student-card be-counsel-form"><label><span>제목</span><input id="be-counsel-title" type="text" maxlength="100" placeholder="상담 제목을 입력하세요"></label><fieldset><legend>상담할 선생님</legend><div class="be-teacher-grid">${data.teachers.map((teacher,index)=>`<label><input type="radio" name="be-teacher" value="${escapeHtml(teacher.value)}" ${index===0?"checked":""}><span><img src="${escapeHtml(teacher.image)}" alt=""><strong>${escapeHtml(teacher.name)}</strong><small>${escapeHtml(teacher.subject||"담당 선생님")}</small></span></label>`).join("")}</div></fieldset><label><span>상담 유형</span><select id="be-counsel-kind"><option value="">상담 유형을 선택하세요</option>${data.kinds.map((kind)=>`<option value="${escapeHtml(kind.value)}">${escapeHtml(kind.label)}</option>`).join("")}</select></label><label><span>내용</span><textarea id="be-counsel-content" rows="9" placeholder="상담 내용을 구체적으로 작성해 주세요"></textarea><small>한글, 영문 및 일반적인 문장부호를 사용할 수 있습니다.</small></label><div class="be-counsel-form-actions"><a href="/mypage/sub09_04.aspx">취소</a><button type="button" class="be-counsel-submit">상담 등록</button></div></section>`);
    document.body.appendChild(root); bindStudentShell(root);
    root.querySelector(".be-counsel-submit")?.addEventListener("click",()=>{ const title=root.querySelector("#be-counsel-title")?.value.trim(); const content=root.querySelector("#be-counsel-content")?.value.trim(); const kind=root.querySelector("#be-counsel-kind")?.value; const teacher=root.querySelector('input[name="be-teacher"]:checked')?.value; if(!title||title.length<3){alert("제목을 3자 이상 입력해 주세요.");return;} if(!teacher){alert("상담할 선생님을 선택해 주세요.");return;} if(!kind){alert("상담 유형을 선택해 주세요.");return;} if(!content){alert("상담 내용을 입력해 주세요.");return;} document.getElementById("txttitle").value=title; document.getElementById("txtcontent").value=content; document.getElementById("cmbkind").value=kind; const legacyTeacher=document.querySelector(`#rptContentList input[name="optteacher"][value="${CSS.escape(teacher)}"]`); if(legacyTeacher)legacyTeacher.checked=true; document.getElementById("Hteacheridx").value=teacher; document.getElementById("imgSave")?.click(); });
  }

  function readHomeworkPopup() {
    const table=Array.from(document.querySelectorAll("table")).find((item)=>{ const text=clean(item.querySelector("tr")?.textContent); return text.includes("선생님명")&&text.includes("과제")&&text.includes("과제하기"); });
    const actionLabel=(node)=>{ const raw=[clean(node.textContent),node.getAttribute("value"),node.getAttribute("alt"),node.getAttribute("title"),node.getAttribute("src"),node.querySelector("img")?.getAttribute("alt"),node.querySelector("img")?.getAttribute("src")].filter(Boolean).join(" ").toLowerCase(); if(/온라인.?보카|단어.?과제|단어.?학습|online.?voca|vocab|btn[_-]?word|word.?homework|word.?test/.test(raw))return "온라인 보카"; if(/온라인.?리스닝|리스닝.?과제|listening/.test(raw))return "온라인 리스닝"; if(/뉴스.?과제|news/.test(raw))return "뉴스 과제"; if(/에세이.?과제|essay/.test(raw))return "에세이 과제"; return ""; };
    const actionStatus=(node)=>{ let cursor=node.closest("a,button,input")||node; for(let step=0;step<10;step+=1){ cursor=cursor?.nextSibling; if(!cursor)break; if(cursor.nodeType===Node.ELEMENT_NODE&&actionLabel(cursor))break; const text=clean(cursor.nodeType===Node.TEXT_NODE?cursor.nodeValue:cursor.textContent); const match=text.match(/(불합격|합격|미응시|None)/i); if(match){ const raw=match[1].toLowerCase(); return raw==="none"||raw==="미응시"?{label:"미응시",tone:"pending"}:raw==="불합격"?{label:"불합격",tone:"fail"}:{label:"합격",tone:"pass"}; } } return null; };
    const rows=Array.from(table?.querySelectorAll("tr")||[]).filter((row)=>row.querySelectorAll(":scope > td").length>=6).map((row,index)=>{
      const cells=Array.from(row.querySelectorAll(":scope > td"));
      const content=cells[5]?.cloneNode(true);
      content?.querySelectorAll("script,style,input,select,button").forEach((node)=>node.remove());
      const plain=clean(content?.textContent);
      const confirmPrompt=/과제\s*확인\s*을?\s*눌러\s*주세요/i.test(plain);
      if(confirmPrompt&&content){
        const promptPattern=/과제\s*확인\s*을?\s*눌러\s*주세요/gi;
        const promptNodes=Array.from(content.querySelectorAll("*")).filter((node)=>/과제\s*확인\s*을?\s*눌러\s*주세요/i.test(clean(node.textContent))&&!Array.from(node.children).some((child)=>/과제\s*확인\s*을?\s*눌러\s*주세요/i.test(clean(child.textContent))));
        promptNodes.forEach((node)=>node.remove());
        const promptWalker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT); const remainingPromptNodes=[]; while(promptWalker.nextNode())remainingPromptNodes.push(promptWalker.currentNode); remainingPromptNodes.forEach((node)=>{node.nodeValue=node.nodeValue.replace(promptPattern,"");});
      }
      if(content){
        const isEmptyLead=(node)=>node.nodeType===Node.TEXT_NODE?!clean(node.nodeValue):node.nodeType===Node.ELEMENT_NODE&&(node.tagName==="BR"||(!clean(node.textContent)&&!node.querySelector("img,table,a,input,button")));
        while(content.firstChild&&isEmptyLead(content.firstChild))content.firstChild.remove();
        const firstBlock=content.firstElementChild;
        if(firstBlock){while(firstBlock.firstChild&&isEmptyLead(firstBlock.firstChild))firstBlock.firstChild.remove();}
      }
      const due=plain.match(/(\d{4})-(\d{2})-(\d{2})\(([^)]+)\)날까지\s*숙제\s*완료해야함\s*\[([^\]]+)\]/);
      const deadline=due?{date:`${due[1]}.${due[2]}.${due[3]}`,weekday:due[4],rawStatus:due[5],status:due[5].replace(/오늘까지해야함/g,"오늘 마감").replace(/(-?\d+)일남음/g,"$1일 남음").replace(/-?(\d+)일지남/g,"$1일 지남"),tone:/지남/.test(due[5])?"overdue":/오늘/.test(due[5])?"today":"upcoming"}:null;
      if(due&&content){
        const deadlineParts=Array.from(content.querySelectorAll("*")).filter((node)=>{ const text=clean(node.textContent); return (/\d{4}-\d{2}-\d{2}\([^)]+\)날까지\s*숙제\s*완료해야함/.test(text)||text===`[${due[5]}]`)&&!Array.from(node.children).some((child)=>{ const childText=clean(child.textContent); return /\d{4}-\d{2}-\d{2}\([^)]+\)날까지\s*숙제\s*완료해야함/.test(childText)||childText===`[${due[5]}]`; }); });
        deadlineParts.forEach((node)=>node.remove());
        const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT); const textNodes=[]; while(walker.nextNode())textNodes.push(walker.currentNode); textNodes.forEach((node)=>{ node.nodeValue=node.nodeValue.replace(/\d{4}-\d{2}-\d{2}\([^)]+\)날까지\s*숙제\s*완료해야함/g,"").replace(`[${due[5]}]`,""); });
      }
      const links=Array.from(cells[4]?.querySelectorAll("a[href]")||[]).map((link)=>({name:clean(link.textContent)||decodeURIComponent((link.getAttribute("href")||"").split("/").pop()||"숙제 파일"),href:absolute(link.getAttribute("href"))}));
      const assessmentText=clean(cells[3]?.textContent).replace(/과제\s*확인/g,"");
      const assessments=Array.from(assessmentText.matchAll(/([^:]+?)\s*Max점수\s*:\s*([\d.]+)\s*자기점수\s*:\s*([\d.]+)\s*반평균\s*:\s*([\d.]+)/g)).map((match)=>({name:clean(match[1]),max:match[2],score:match[3],average:match[4]}));
      const candidates=Array.from(cells[6]?.querySelectorAll('a,button,input[type="button"],input[type="submit"],input[type="image"],[onclick]')||[]);
      const actions=candidates.map((node)=>({node,label:actionLabel(node),status:actionStatus(node)})).filter((item)=>item.label).filter((item,position,all)=>all.findIndex((other)=>other.label===item.label)===position);
      actions.forEach((action,actionIndex)=>{ const clickable=action.node.closest("a,button,input")||action.node; action.node=clickable; action.bridgeId=`homework-${index}-${actionIndex}`; clickable.setAttribute("data-better-esimson-action",action.bridgeId); });
      const nonActionCandidates=candidates.filter((node)=>!actionLabel(node));
      const legacySave=nonActionCandidates.find((node)=>/체크|저장|save|self.?check/i.test([clean(node.textContent),node.getAttribute("value"),node.getAttribute("alt"),node.getAttribute("title"),node.getAttribute("id"),node.getAttribute("name"),node.getAttribute("src"),node.getAttribute("onclick"),node.getAttribute("href"),node.querySelector("img")?.getAttribute("alt"),node.querySelector("img")?.getAttribute("src")].filter(Boolean).join(" ")))||nonActionCandidates.at(-1);
      const saveBridgeId=legacySave?`homework-save-${index}`:"";
      if(legacySave)legacySave.setAttribute("data-better-esimson-action",saveBridgeId);
      const confirmCandidates=Array.from(cells[3]?.querySelectorAll('a,button,input[type="button"],input[type="submit"],input[type="image"],img[onclick]')||[]);
      const legacyConfirm=confirmCandidates.find((node)=>/과제\s*확인|homework|btn[_-]?(?:hw|homework|check)/i.test([clean(node.textContent),node.getAttribute("value"),node.getAttribute("alt"),node.getAttribute("title"),node.getAttribute("src"),node.querySelector("img")?.getAttribute("alt"),node.querySelector("img")?.getAttribute("src")].filter(Boolean).join(" ")))||confirmCandidates[0];
      const meaningfulContent=clean(content?.textContent).replace(/\bNone\b/gi,"").replace(/[-\s]/g,"");
      const hasHomeworkData=meaningfulContent.length>=5||Boolean(deadline)||assessments.length>0||links.length>0||actions.length>0;
      return {index,className:clean(cells[0]?.textContent),teacher:clean(cells[1]?.textContent),progress:clean(cells[2]?.textContent),deadline,assessments,contentHtml:content?.innerHTML||"",files:links,actions,legacyConfirm,needsConfirm:Boolean(legacyConfirm)&&(confirmPrompt||!hasHomeworkData),legacySelect:cells[6]?.querySelector("select"),legacySave,saveBridgeId};
    });
    return { title:"숙제 확인", rows };
  }

  function renderHomeworkPopup(data,autoSelfCheckEnabled=true) {
    let autoSelectedCount=0;
    if(autoSelfCheckEnabled)data.rows.forEach((item)=>{
      const select=item.legacySelect;
      const selected=select?.selectedOptions?.[0];
      if(!select||!item.legacySave||!/^no\s*check$/i.test(clean(selected?.textContent)||String(select.value).trim()))return;
      const preferred=Array.from(select.options).find((option)=>clean(option.textContent)==="매우만족")||select.options[1];
      if(!preferred)return;
      select.value=preferred.value;
      preferred.selected=true;
      select.dispatchEvent(new Event("input",{bubbles:true}));
      select.dispatchEvent(new Event("change",{bubbles:true}));
      item.autoSelfCheckSelected=true;
      autoSelectedCount+=1;
    });
    const root=document.createElement("div"); root.id="better-esimson-root"; root.className="be-homework-popup";
    root.innerHTML=`<header><div><span>ATTENDANCE & HOMEWORK</span><h1>${escapeHtml(data.title)}</h1></div></header><main>${data.rows.length?data.rows.map((item)=>`<article class="be-homework-item" data-homework-index="${item.index}"><div class="be-homework-meta"><span>${escapeHtml(item.className)}</span><strong>${escapeHtml(item.teacher)}</strong><small>${escapeHtml(item.progress)}</small>${item.assessments.length?`<div class="be-homework-scores">${item.assessments.map((test)=>`<article><span>TEST RESULT</span><strong>${escapeHtml(test.name)}</strong><dl><div><dt>내 점수</dt><dd>${escapeHtml(test.score)}<small> / ${escapeHtml(test.max)}</small></dd></div><div><dt>반 평균</dt><dd>${escapeHtml(test.average)}</dd></div></dl></article>`).join("")}</div>`:""}${item.actions.length?`<div class="be-homework-tools">${item.actions.map((action,actionIndex)=>{ const tone=action.label.includes("뉴스")?"news":action.label.includes("리스닝")?"listening":action.label.includes("보카")?"voca":"essay"; return `<div class="be-homework-tool"><button class="is-${tone}" type="button" data-homework-action="${actionIndex}"><span>${escapeHtml(action.label)}</span></button>${action.status?`<span class="be-homework-action-status is-${action.status.tone}">${escapeHtml(action.status.label)}</span>`:""}</div>`; }).join("")}</div>`:""}</div><div class="be-homework-body"><div class="be-homework-gated ${item.needsConfirm?"is-locked":""}"><div class="be-homework-private">${item.deadline?`<div class="be-homework-deadline"><span>마감일</span><strong>${escapeHtml(item.deadline.date)} (${escapeHtml(item.deadline.weekday)})</strong><em class="is-${item.deadline.tone}">${escapeHtml(item.deadline.status)}</em></div>`:""}<div class="be-homework-content">${item.contentHtml}</div>${item.files.length?`<div class="be-homework-resources"><div class="be-homework-files">${item.files.map((file)=>`<a href="${escapeHtml(file.href)}" download>${icon("download")}<span>${escapeHtml(file.name)}</span></a>`).join("")}</div></div>`:""}</div>${item.needsConfirm?`<button class="be-homework-confirm" type="button"><span>숙제 데이터를 불러오려면 확인이 필요해요.</span><strong>숙제 확인</strong></button>`:""}</div></div><div class="be-homework-check"><label>Self Check<select>${item.legacySelect?Array.from(item.legacySelect.options).map((option)=>`<option value="${escapeHtml(option.value)}" ${option.selected?"selected":""}>${escapeHtml(option.textContent)}</option>`).join(""):`<option>선택 항목 없음</option>`}</select></label><button class="be-homework-save" type="button" ${item.legacySave?"":"disabled"}>저장</button></div></article>`).join(""):`<div class="be-homework-popup-empty"><strong>표시할 숙제가 없습니다.</strong><p>숙제 정보가 등록되면 이곳에서 확인할 수 있습니다.</p></div>`}</main>`;
    document.body.appendChild(root);
    if(autoSelectedCount)showToast(autoSelectedCount===1?"Self Check를 매우만족으로 선택했어요.":`Self Check ${autoSelectedCount}건을 매우만족으로 선택했어요.`);
    chrome.storage.local.get("studentDarkMode",({studentDarkMode})=>{ const enabled=studentDarkMode===true; root.classList.toggle("is-dark",enabled); document.documentElement.classList.toggle("be-homework-dark",enabled); });
    const runLegacyAction=(bridgeId,fallback)=>{ if(bridgeId){ document.documentElement.setAttribute("data-better-esimson-click-target",bridgeId); document.dispatchEvent(new Event("better-esimson-page-click")); }else fallback?.click(); };
    data.rows.forEach((item)=>{ const card=root.querySelector(`[data-homework-index="${item.index}"]`); card?.querySelector(".be-homework-confirm")?.addEventListener("click",(event)=>{ const button=event.currentTarget; button.disabled=true; button.classList.add("is-loading"); button.querySelector("span").textContent="숙제 데이터를 불러오고 있어요."; button.querySelector("strong").textContent="불러오는 중…"; setTimeout(()=>item.legacyConfirm?.click(),80); }); card?.querySelector("select")?.addEventListener("change",(event)=>{ if(!item.legacySelect)return; item.legacySelect.value=event.target.value; item.legacySelect.dispatchEvent(new Event("change",{bubbles:true})); }); card?.querySelector(".be-homework-save")?.addEventListener("click",()=>runLegacyAction(item.saveBridgeId,item.legacySave)); card?.querySelectorAll("[data-homework-action]").forEach((button)=>button.addEventListener("click",()=>{ const action=item.actions[Number(button.dataset.homeworkAction)]; if(!action?.node)return; runLegacyAction(action.bridgeId,action.node); })); });
    const autoSaveItem=data.rows.find((item)=>item.autoSelfCheckSelected&&item.legacySave);
    if(autoSaveItem){
      setTimeout(()=>{ showToast("Self Check를 매우만족으로 저장해요."); runLegacyAction(autoSaveItem.saveBridgeId,autoSaveItem.legacySave); },650);
    }
  }

  function submitLegacyLogin() {
    const modernId = document.getElementById("be-user-id");
    const modernPw = document.getElementById("be-user-pw");
    const legacyId = document.getElementById("txtmainid");
    const legacyPw = document.getElementById("txtmainpwd");
    if (!modernId?.value.trim() || !modernPw?.value) { alert("아이디와 비밀번호를 입력해 주세요."); return; }
    if (!legacyId || !legacyPw) { location.assign("/member/login.aspx"); return; }
    legacyId.value = modernId.value.trim();
    legacyPw.value = modernPw.value;
    document.getElementById("imgMainLogin")?.click();
  }

  function createToolbar() {
    const bar = document.createElement("div");
    bar.id = "better-esimson-toolbar";
    const vocaOptions = isVocaHelperPage ? `<section class="be-voca-options"><div><span>VOCA HELPER</span><strong>온라인 보카 도우미</strong></div><label class="be-tool-toggle be-voca-option" data-voca-option="helper"><span><strong>Helper</strong><small>정답을 알아보기 쉽게 표시</small></span><input type="checkbox"><i aria-hidden="true"></i></label><label class="be-tool-toggle be-voca-option" data-voca-option="auto"><span><strong>Auto</strong><small>QA 자동 선택 실행</small></span><input type="checkbox" disabled><i aria-hidden="true"></i></label><div class="be-voca-auto-options" hidden><label class="be-tool-toggle be-voca-option is-sub" data-voca-option="delay"><span><strong>랜덤 딜레이</strong><small>문제마다 2.0–8.0초 대기</small></span><input type="checkbox" disabled><i aria-hidden="true"></i></label><label class="be-tool-toggle be-voca-option is-sub" data-voca-option="wrong"><span><strong>오답 테스트</strong><small>정답 전 오답 1–3회 선택</small></span><input type="checkbox" disabled><i aria-hidden="true"></i></label></div></section>` : "";
    const selfCheckOption=isStudentPage?`<label class="be-tool-toggle be-self-check-toggle"><span><strong>자동 Self Check</strong><small>No Check를 매우만족으로 저장</small></span><input type="checkbox" checked><i aria-hidden="true"></i></label>`:"";
    bar.innerHTML = `<button class="be-tool-trigger" type="button" aria-label="Better Esimson 메뉴"><img src="${extensionIcon}" alt=""></button><div class="be-tool-panel" hidden><div><img class="be-tool-logo" src="${extensionIcon}" alt=""><p><strong>Better Esimson</strong><small>${supportsModernUi ? "디자인 설정" : isVocaHelperPage ? "보카 도우미 설정" : "이 페이지는 준비 중"}</small></p><button class="be-tool-close" type="button" aria-label="닫기">${icon("close")}</button></div>${supportsModernUi ? `<label class="be-tool-toggle be-design-toggle"><span><strong>새 디자인</strong><small>${supportsModernHeader?"Better Esimson 헤더 사용":"Better Esimson 화면 사용"}</small></span><input type="checkbox" ${state.modern ? "checked" : ""}><i aria-hidden="true"></i></label>${selfCheckOption}` : `<p class="be-tool-note">${isVocaHelperPage ? "보카 화면은 원본 디자인으로 표시됩니다." : "이 페이지는 아직 원본 그대로 표시됩니다."}</p>`}${vocaOptions}</div>`;
    document.body.appendChild(bar);
    const panel = bar.querySelector(".be-tool-panel");
    panel.addEventListener("pointerdown",(event)=>event.stopPropagation());
    const setPanel = (open) => { panel.hidden = !open; bar.classList.toggle("is-open", open); };
    const trigger = bar.querySelector(".be-tool-trigger");
    enableToolbarDrag(bar, trigger, setPanel);
    bar.querySelector(".be-tool-close").addEventListener("click", () => setPanel(false));
    document.addEventListener("pointerdown",(event)=>{ if(!panel.hidden&&!bar.contains(event.target))setPanel(false); });
    document.addEventListener("keydown",(event)=>{ if(event.key==="Escape"&&!panel.hidden)setPanel(false); });
    bar.querySelector(".be-design-toggle input")?.addEventListener("change", (event) => {
      setModern(event.target.checked);
      chrome.storage.local.set({ designEnabled: event.target.checked });
      showToast(event.target.checked?"커스텀 UI를 켰어요.":"커스텀 UI를 껐어요.",event.target.checked?"success":"neutral");
    });
    const selfCheckToggle=bar.querySelector(".be-self-check-toggle input");
    if(selfCheckToggle){
      bar.querySelector(".be-self-check-toggle")?.addEventListener("click",(event)=>{ if(!event.target.closest("i"))event.preventDefault(); });
      chrome.storage.local.get("autoSelfCheck",({autoSelfCheck})=>{ selfCheckToggle.checked=autoSelfCheck!==false; });
      selfCheckToggle.addEventListener("change",(event)=>{ chrome.storage.local.set({autoSelfCheck:event.target.checked}); showToast(event.target.checked?"자동 Self Check를 켰어요.":"자동 Self Check를 껐어요.",event.target.checked?"success":"neutral"); });
    }
    if (isVocaHelperPage) {
      const command = (action, enabled) => document.dispatchEvent(new CustomEvent("better-esimson-voca-command", { detail: { action, enabled } }));
      bar.querySelectorAll("[data-voca-option]").forEach((option) => option.querySelector("input")?.addEventListener("change", (event) => command(option.dataset.vocaOption, event.target.checked)));
      document.addEventListener("better-esimson-voca-state", (event) => {
        const vocaState = event.detail || {};
        const helper = bar.querySelector('[data-voca-option="helper"] input');
        const auto = bar.querySelector('[data-voca-option="auto"] input');
        const delay = bar.querySelector('[data-voca-option="delay"] input');
        const wrong = bar.querySelector('[data-voca-option="wrong"] input');
        const autoOptions = bar.querySelector(".be-voca-auto-options");
        helper.checked = Boolean(vocaState.helper); auto.checked = Boolean(vocaState.auto); delay.checked = Boolean(vocaState.delay); wrong.checked = Boolean(vocaState.wrong);
        auto.disabled = !vocaState.helper; autoOptions.hidden = !vocaState.auto; delay.disabled = !vocaState.helper || !vocaState.auto; wrong.disabled = !vocaState.helper || !vocaState.auto;
      });
      setTimeout(() => command("state"), 50);
    }
  }

  function enableToolbarDrag(bar, handle, setPanel) {
    const margin = 18;
    const applyCorner = (corner) => {
      bar.style.left = corner.includes("left") ? `${margin}px` : "auto";
      bar.style.right = corner.includes("right") ? `${margin}px` : "auto";
      bar.style.top = corner.includes("top") ? `${margin}px` : "auto";
      bar.style.bottom = corner.includes("bottom") ? `${margin}px` : "auto";
      bar.dataset.corner = corner;
    };
    chrome.storage.local.get("toolbarCorner", ({ toolbarCorner }) => applyCorner(toolbarCorner || "bottom-right"));
    let start = null;
    handle.addEventListener("pointerdown", (event) => {
      start = { x: event.clientX, y: event.clientY, left: bar.getBoundingClientRect().left, top: bar.getBoundingClientRect().top, moved: false, wasOpen:document.querySelector("#better-esimson-toolbar .be-tool-panel")?.hidden===false };
      handle.setPointerCapture(event.pointerId);
      setPanel(false);
      bar.classList.add("is-dragging");
      event.preventDefault();
    });
    handle.addEventListener("pointermove", (event) => {
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) start.moved = true;
      bar.style.left = `${Math.max(margin, Math.min(innerWidth - 52 - margin, start.left + dx))}px`;
      bar.style.top = `${Math.max(margin, Math.min(innerHeight - 52 - margin, start.top + dy))}px`;
      bar.style.right = "auto";
      bar.style.bottom = "auto";
    });
    handle.addEventListener("pointerup", (event) => {
      if (!start) return;
      handle.releasePointerCapture(event.pointerId);
      const wasMoved = start.moved;
      const wasOpen = start.wasOpen;
      if (wasMoved) {
        const rect = bar.getBoundingClientRect();
        const corner = `${rect.top + rect.height / 2 < innerHeight / 2 ? "top" : "bottom"}-${rect.left + rect.width / 2 < innerWidth / 2 ? "left" : "right"}`;
        applyCorner(corner);
        chrome.storage.local.set({ toolbarCorner: corner });
      }
      bar.classList.remove("is-dragging");
      start = null;
      if (!wasMoved) setPanel(!wasOpen);
    });
  }

  function setModern(enabled) {
    state.modern = enabled;
    if(supportsModernHeader){
      document.documentElement.classList.toggle("better-esimson-header-active",enabled);
      document.querySelector(".be-legacy-modern-header")?.toggleAttribute("hidden",!enabled);
      document.querySelector(".be-legacy-footer-host")?.toggleAttribute("hidden",!enabled);
      const toggle=document.querySelector(".be-design-toggle input");
      if(toggle)toggle.checked=enabled;
      return;
    }
    document.documentElement.classList.toggle("better-esimson-active", enabled);
    originalNodes.forEach((node) => node.classList.toggle("better-esimson-legacy-hidden", enabled));
    document.getElementById("better-esimson-root")?.toggleAttribute("hidden", !enabled);
    const toggle = document.querySelector(".be-design-toggle input");
    if (toggle) toggle.checked = enabled;
  }

  if (isHomeworkPopup) {
    chrome.storage.local.get(["designEnabled","autoSelfCheck"],({designEnabled,autoSelfCheck})=>{ renderHomeworkPopup(readHomeworkPopup(),autoSelfCheck!==false); setModern(designEnabled!==false); });
    return;
  }
  if (isHome) renderHome(readPage());
  if (isStudentDashboard) renderStudentDashboard(readStudentDashboard());
  if (isGradesPage) renderGrades(readGrades());
  if (isGradeDetailPage) renderGradeDetail(readGradeDetail());
  if (isPointsPage) renderPoints(readPoints());
  if (isCounselListPage) renderCounselList(readCounselList());
  if (isCounselDetailPage) renderCounselDetail(readCounselDetail());
  if (isCounselWritePage) renderCounselWrite(readCounselWrite());
  if (supportsModernHeader) renderLegacyModernHeader(readPage());
  createToolbar();
  if (supportsModernUi) chrome.storage.local.get("designEnabled", ({ designEnabled }) => setModern(designEnabled !== false));
})();

// Integrated Esimson Voca Helper. Keep this isolated from non-vocabulary pages.
(() => {
  if (!/^\/exam\/high_voca(?:_start|01_test|02_test)\.aspx$/i.test(location.pathname)) return;
  /**
   * Esimson Online Voca Helper
   *
   * 원리 요약:
   * 1. 이 페이지는 문제/정답 데이터를 "hidden input"으로 전부 내려보냄
   * 2. 현재 문제 번호는 #HidCnt (0부터 시작)
   * 3. 실제 정답 단어는 input[name="HidWordName"][HidCnt]
   * 4. 보기는 #spnMunJae 안의 label 텍스트
   * 5. 정답 단어 === 보기 텍스트 → CSS 하이라이트
   */
  
  // 치팅 ON/OFF 상태
  let CHEAT_ENABLED = false;
  let AUTO_ENABLED = false;
  let QA_DELAY_ENABLED = false;
  let QA_WRONG_ENABLED = false;
  let LAST_AUTO_KEY = "";
  let AUTO_PENDING = false;
  let AUTO_TIMER_IDS = [];
  
  function normalizeText(text) {
    return (text || "")
      .replace(/\s+/g, " ")
      .replace(/^\s*\d+\s*[).]?\s*/, "")
      .trim()
      .toLowerCase();
  }
  
  function getOptionText(inputEl) {
    const label = inputEl.closest("label") || (inputEl.id ? document.querySelector(`label[for="${inputEl.id}"]`) : null) || inputEl.closest("li");
  
    return label ? label.textContent.trim() : "";
  }
  
  function findAnswerOptions() {
    const options = Array.from(document.querySelectorAll("#spnMunJae input[onclick]"));
  
    if (!options.length) return { options: [], answerIndex: -1 };
  
    let answerIndex = -1;
  
    options.forEach((opt, idx) => {
      if (opt.getAttribute("onclick")?.includes("setCheck('o')")) {
        answerIndex = idx;
      }
    });
  
    if (answerIndex < 0) {
      const hidCnt = parseInt(document.querySelector('input[name="HidCnt"]')?.value ?? "-1", 10);
      const hidWords = Array.from(document.querySelectorAll('input[name="HidWordName"]')).map((el) => el.value || "");
      const answerWord = hidWords[hidCnt] || "";
      const answerNorm = normalizeText(answerWord);
  
      if (answerNorm) {
        answerIndex = options.findIndex((opt) => normalizeText(getOptionText(opt)) === answerNorm);
      }
    }
  
    return { options, answerIndex };
  }
  
  function isEditableTarget(target) {
    if (!(target instanceof Element)) return false;
  
    return Boolean(target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
  }
  
  function clickOptionByNumber(optionNumber) {
    const { options } = findAnswerOptions();
    const optionInput = options[optionNumber - 1];
    if (!optionInput || optionInput.disabled) return false;
  
    const label = optionInput.closest("label") || (optionInput.id ? document.querySelector(`label[for="${optionInput.id}"]`) : null);
  
    if (label) {
      label.click();
    } else {
      optionInput.click();
    }
  
    return true;
  }
  
  // 숫자열/숫자패드 1~5로 현재 문제의 같은 번호 보기를 선택
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) return;
  
      const optionNumber = Number(event.key);
      if (!Number.isInteger(optionNumber) || optionNumber < 1 || optionNumber > 5) return;
      if (!clickOptionByNumber(optionNumber)) return;
  
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
  
  function highlightAnswer() {
    if (!CHEAT_ENABLED) return;
  
    // 1️⃣ onclick 기반으로 정답 찾기 (01 / 02 공통)
    const { options, answerIndex } = findAnswerOptions();
    if (!options.length) return;
  
    console.log(
      "[Helper] options =",
      options.map((o) => o.getAttribute("onclick")),
    );
    console.log("[Helper] 정답 번호 =", answerIndex + 1);
  
    // 2️⃣ 스타일 초기화 + 하이라이트
    options.forEach((opt, idx) => {
      const target = opt.closest("label") || opt.closest("li");
  
      if (!target) return;
  
      target.style.background = "";
      target.style.border = "";
      target.style.borderRadius = "";
      target.style.outline = "";
      target.style.outlineOffset = "";
      target.style.boxShadow = "";
  
      if (idx === answerIndex) {
        target.style.outline = "3px solid #ff3b30";
        target.style.outlineOffset = "2px";
        target.style.borderRadius = "10px";
        target.style.background = "linear-gradient(90deg, rgba(255,59,48,0.18), rgba(255,59,48,0.06))";
        target.style.boxShadow = "0 0 0 4px rgba(255, 59, 48, 0.25)";
      }
    });
  }
  
  function autoClickAnswer() {
    if (!AUTO_ENABLED) return;
  
    const { options, answerIndex } = findAnswerOptions();
    if (!options.length || answerIndex < 0) return;
  
    const questionIndex = document.querySelector('input[name="HidCnt"]')?.value ?? "";
    const autoKey = `${questionIndex}-${answerIndex}`;
    if (LAST_AUTO_KEY === autoKey || AUTO_PENDING) return;
  
    AUTO_PENDING = true;
    LAST_AUTO_KEY = autoKey;
    const delaySeconds = QA_DELAY_ENABLED ? Math.round((2 + Math.random() * 6) * 10) / 10 : 0.2;
    const wrongIndexes = options.map((_, index) => index).filter((index) => index !== answerIndex).sort(() => Math.random() - 0.5);
    const wrongCount = QA_WRONG_ENABLED && wrongIndexes.length ? Math.min(wrongIndexes.length, Math.floor(Math.random() * 3) + 1) : 0;
    const sequence = wrongIndexes.slice(0, wrongCount).concat(answerIndex);
  
    console.info("[Better Esimson QA] 문항 자동화 예약", { question: questionIndex, delaySeconds, wrongAttempts: wrongCount });
  
    const stillCurrent = () => {
      const currentIndex = document.querySelector('input[name="HidCnt"]')?.value ?? "";
      const current = findAnswerOptions();
      return AUTO_ENABLED && currentIndex === questionIndex && current.answerIndex === answerIndex;
    };
    const clickAt = (position) => {
      if (!stillCurrent()) {
        AUTO_PENDING = false;
        console.info("[Better Esimson QA] 문항 변경 감지 — 남은 클릭 취소", { question: questionIndex });
        return;
      }
      const optionIndex = sequence[position];
      const option = findAnswerOptions().options[optionIndex];
      if (!option) { AUTO_PENDING = false; return; }
      const target = option.closest("label") || (option.id ? document.querySelector(`label[for="${option.id}"]`) : null) || option;
      console.info("[Better Esimson QA] 선택", { question: questionIndex, option: optionIndex + 1, correct: optionIndex === answerIndex });
      target.click();
      if (position < sequence.length - 1) {
        const timer = setTimeout(() => clickAt(position + 1), 320 + Math.round(Math.random() * 380));
        AUTO_TIMER_IDS.push(timer);
      } else {
        AUTO_PENDING = false;
      }
    };
    const timer = setTimeout(() => clickAt(0), Math.round(delaySeconds * 1000));
    AUTO_TIMER_IDS.push(timer);
  }
  
  function clearAutoTimers() {
    AUTO_TIMER_IDS.forEach((timer) => clearTimeout(timer));
    AUTO_TIMER_IDS = [];
    AUTO_PENDING = false;
  }
  
  function updateQaBanner() {
    let banner = document.getElementById("better-esimson-qa-banner");
    if (!AUTO_ENABLED) { banner?.remove(); return; }
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "better-esimson-qa-banner";
      banner.setAttribute("role", "status");
      document.body.appendChild(banner);
    }
    const activeOptions = [QA_DELAY_ENABLED && "랜덤 지연 2.0–8.0초", QA_WRONG_ENABLED && "오답 1–3회"].filter(Boolean);
    banner.textContent = `QA 자동화 테스트 실행 중${activeOptions.length ? ` · ${activeOptions.join(" · ")}` : ""}`;
  }
  
  // DOM 변경 감지 (문제 넘어갈 때 SetNext1이 DOM을 다시 그림)
  const observer = new MutationObserver(() => {
    requestAnimationFrame(() => {
      highlightAnswer();
      autoClickAnswer();
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  function clearAnswerHighlight() {
    Array.from(document.querySelectorAll("#spnMunJae *, .sel-ex *")).filter((element) => element.textContent && element.textContent.trim()).forEach((option) => {
      const target = option.closest("label") || option.closest("li") || option;
      ["background", "border", "borderRadius", "padding", "outline", "outlineOffset", "boxShadow"].forEach((property) => { target.style[property] = ""; });
    });
  }
  
  function publishVocaState() {
    document.dispatchEvent(new CustomEvent("better-esimson-voca-state", { detail: { helper: CHEAT_ENABLED, auto: AUTO_ENABLED, delay: QA_DELAY_ENABLED, wrong: QA_WRONG_ENABLED } }));
  }
  
  function setHelper(enabled) {
    CHEAT_ENABLED = enabled;
    if (enabled) requestAnimationFrame(() => { highlightAnswer(); if (AUTO_ENABLED) autoClickAnswer(); });
    else { AUTO_ENABLED = false; QA_DELAY_ENABLED = false; QA_WRONG_ENABLED = false; clearAutoTimers(); clearAnswerHighlight(); }
    updateQaBanner();
    publishVocaState();
  }
  
  function restartAuto() { clearAutoTimers(); LAST_AUTO_KEY = ""; if (AUTO_ENABLED) requestAnimationFrame(autoClickAnswer); }
  function setAuto(enabled) { AUTO_ENABLED = CHEAT_ENABLED && enabled; restartAuto(); updateQaBanner(); publishVocaState(); }
  function setDelay(enabled) { QA_DELAY_ENABLED = AUTO_ENABLED && enabled; restartAuto(); updateQaBanner(); publishVocaState(); }
  function setWrong(enabled) { QA_WRONG_ENABLED = AUTO_ENABLED && enabled; restartAuto(); updateQaBanner(); publishVocaState(); }
  
  document.addEventListener("better-esimson-voca-command", (event) => {
    const { action, enabled } = event.detail || {};
    if (action === "helper") setHelper(Boolean(enabled));
    else if (action === "auto") setAuto(Boolean(enabled));
    else if (action === "delay") setDelay(Boolean(enabled));
    else if (action === "wrong") setWrong(Boolean(enabled));
    else if (action === "state") publishVocaState();
  });
  
  setTimeout(publishVocaState, 0);
  
})();
