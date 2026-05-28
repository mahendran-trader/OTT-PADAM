import { useState, useMemo, useEffect, useCallback, useRef } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const TMDB_KEY = "52db03cda8e9afb301a5e5e6035e73a9";
const TMDB     = "https://api.themoviedb.org/3";
const IMG      = "https://image.tmdb.org/t/p/w500";
const IMG_SM   = "https://image.tmdb.org/t/p/w185";
const K        = `api_key=${TMDB_KEY}`;

// TMDb provider IDs for India — verified live from browser
const PROVIDER_MAP = {
  8:    "Netflix",
  119:  "Prime Video",
  2336: "JioHotstar",
  232:  "ZEE5",
  237:  "SonyLIV",
  309:  "Sun NXT",
  532:  "Aha",
  350:  "Apple TV+",
  561:  "Lionsgate Play",
  315:  "Hoichoi",
  515:  "MX Player",
  510:  "Discovery+",
};

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const C = {
  base:    "#0C0C10",
  surface: "#16161C",
  card:    "#1A1A22",
  cardHov: "#1F1F29",
  border:  "#28283A",
  muted:   "#60607A",
  body:    "#B8B4C8",
  head:    "#F0EDF8",
  gold:    "#E2B96A",
  gold2:   "#C89A44",
  goldSoft:"#E2B96A22",
  green:   "#4ADE80",
  orange:  "#FB923C",
  purple:  "#A78BFA",
};

const PLATFORM_META = {
  "Netflix":        { color:"#E50914", dot:"#FF5555", bg:"#1A0005" },
  "Prime Video":    { color:"#1A98FF", dot:"#44B4FF", bg:"#00091A" },
  "JioHotstar":     { color:"#1565C0", dot:"#4DA6FF", bg:"#00061A" },
  "ZEE5":           { color:"#9B27AF", dot:"#C260D4", bg:"#0D0011" },
  "Sun NXT":        { color:"#F57C00", dot:"#FFA040", bg:"#150800" },
  "SonyLIV":        { color:"#1A56C4", dot:"#5588EE", bg:"#00051A" },
  "Aha":            { color:"#C8A000", dot:"#ECC840", bg:"#110E00" },
  "Apple TV+":      { color:"#555555", dot:"#AAAAAA", bg:"#111111" },
  "Lionsgate Play": { color:"#FF0000", dot:"#FF6666", bg:"#1A0000" },
  "Hoichoi":        { color:"#E63946", dot:"#FF7070", bg:"#1A0005" },
  "MX Player":      { color:"#00B4D8", dot:"#48CAE4", bg:"#001A1F" },
  "Discovery+":     { color:"#0052D4", dot:"#4A90E2", bg:"#000D2A" },
};

const GENRE_COLORS = {
  28:"#F87171",18:"#60A5FA",35:"#FBBF24",80:"#A78BFA",
  99:"#34D399",10751:"#F472B6",14:"#818CF8",36:"#F59E0B",
  27:"#6EE7B7",10402:"#FCD34D",9648:"#C084FC",10749:"#FB7185",
  878:"#67E8F9",10770:"#FDE68A",53:"#FCA5A5",10752:"#6B7280",
  37:"#D97706",
};

// ─── RESPONSIVE HOOK ─────────────────────────────────────────────────────────
function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn, { passive: true });
    return () => window.removeEventListener("resize", fn);
  }, []);
  return { isMobile: w < 640, isTablet: w >= 640 && w < 1024, isDesktop: w >= 1024, w };
}

// ─── TMDB API HELPERS ─────────────────────────────────────────────────────────
const get = (url) => fetch(url).then(r => r.json());

// Discover: Tamil originals currently on OTT in India (all years, sorted by popularity)
async function fetchMovies(page = 1) {
  return get(`${TMDB}/discover/movie?${K}&with_original_language=ta&watch_region=IN&with_watch_monetization_types=flatrate&sort_by=popularity.desc&page=${page}&language=en-US`);
}

async function fetchSeries(page = 1) {
  return get(`${TMDB}/discover/tv?${K}&with_original_language=ta&watch_region=IN&with_watch_monetization_types=flatrate&sort_by=popularity.desc&page=${page}&language=en-US`);
}

async function fetchDubbed(page = 1) {
  return get(`${TMDB}/discover/movie?${K}&watch_region=IN&with_watch_monetization_types=flatrate&with_original_language=hi%7Cte%7Cml%7Ckn%7Cen&sort_by=popularity.desc&page=${page}&language=ta-IN`);
}

// Search: full TMDb search across ALL years — no OTT filter, broader results
async function searchTMDb(query, page = 1) {
  return get(`${TMDB}/search/multi?${K}&query=${encodeURIComponent(query)}&language=en-US&page=${page}&include_adult=false`);
}

async function fetchProviders(id, type = "movie") {
  const data = await get(`${TMDB}/${type}/${id}/watch/providers?${K}`);
  const flat = data.results?.IN?.flatrate || [];
  return flat.map(p => PROVIDER_MAP[p.provider_id]).filter(Boolean);
}

async function fetchGenres() {
  const [mv, tv] = await Promise.all([
    get(`${TMDB}/genre/movie/list?${K}&language=en-US`),
    get(`${TMDB}/genre/tv/list?${K}&language=en-US`),
  ]);
  const map = {};
  [...(mv.genres || []), ...(tv.genres || [])].forEach(g => { map[g.id] = g.name; });
  return map;
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill={C.gold} opacity="0.1"/>
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke={C.gold} strokeOpacity="0.35"/>
      {[5,13,21].map(x => <rect key={`t${x}`} x={x} y="3"  width="4" height="3" rx="1" fill={C.gold} opacity="0.65"/>)}
      {[5,13,21].map(x => <rect key={`b${x}`} x={x} y="26" width="4" height="3" rx="1" fill={C.gold} opacity="0.65"/>)}
      <rect x="2" y="8" width="28" height="16" rx="1" fill="none" stroke={C.gold} strokeWidth="0.5" strokeOpacity="0.25"/>
      <polygon points="13,12 13,20 21,16" fill={C.gold}/>
    </svg>
  );
}

// ─── SKELETON CARD ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: C.card, borderRadius:"12px", overflow:"hidden",
      border:`1px solid ${C.border}`,
    }}>
      <div style={{height:"260px",background:`linear-gradient(90deg,${C.border}44,${C.border}88,${C.border}44)`,backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite"}}/>
      <div style={{padding:"14px",display:"flex",flexDirection:"column",gap:"8px"}}>
        <div style={{height:"14px",background:C.border,borderRadius:"4px",width:"80%",animation:"shimmer 1.5s infinite"}}/>
        <div style={{height:"11px",background:C.border,borderRadius:"4px",width:"50%",animation:"shimmer 1.5s infinite"}}/>
        <div style={{height:"11px",background:C.border,borderRadius:"4px",width:"65%",animation:"shimmer 1.5s infinite"}}/>
      </div>
    </div>
  );
}

// ─── MOVIE CARD ───────────────────────────────────────────────────────────────
function MovieCard({ item, genreMap, onClick, idx }) {
  const pm  = PLATFORM_META[item.platforms?.[0]] || { color:"#666", dot:"#888", bg:"#111" };
  const [hov, setHov] = useState(false);
  const rating  = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
  const poster  = item.poster_path ? `${IMG}${item.poster_path}` : null;
  const year    = (item.release_date || item.first_air_date || "").slice(0,4);
  const title   = item.title || item.name || "Untitled";
  const genreNames = (item.genre_ids || []).slice(0,2).map(id => genreMap[id]).filter(Boolean);
  const gc = GENRE_COLORS[(item.genre_ids||[])[0]] || C.muted;
  const isRecent = item.release_date
    ? new Date(item.release_date) >= new Date(Date.now() - 30*24*60*60*1000)
    : false;

  return (
    <article
      onClick={() => onClick(item)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.cardHov : C.card,
        border: `1px solid ${hov ? pm.color+"44" : C.border}`,
        borderRadius:"12px", overflow:"hidden", cursor:"pointer",
        transition:"all 0.22s ease",
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hov ? `0 16px 40px rgba(0,0,0,0.55), 0 0 0 1px ${pm.color}22` : "none",
        animation:`fadeUp 0.4s ease both`,
        animationDelay:`${Math.min(idx*0.045,0.5)}s`,
        display:"flex", flexDirection:"column",
        WebkitTapHighlightColor:"transparent",
      }}
    >
      {/* Poster */}
      <div style={{
        position:"relative", aspectRatio:"2/3", overflow:"hidden",
        background: poster ? "#000" : `linear-gradient(135deg,${pm.color}22,${C.base})`,
        flexShrink:0,
      }}>
        {poster
          ? <img src={poster} alt={title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block",transition:"transform 0.4s ease",transform:hov?"scale(1.04)":"scale(1)"}}/>
          : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"42px",color:pm.color,opacity:0.3}}>🎬</div>
        }

        {/* Gradient overlay */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"55%",background:"linear-gradient(to top,rgba(22,22,28,0.97) 0%,transparent 100%)"}}/>

        {/* Badges top */}
        <div style={{position:"absolute",top:"9px",left:"9px",right:"9px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          {isRecent && (
            <span style={{background:C.gold,color:"#0C0C10",fontSize:"8px",fontWeight:"800",padding:"2px 7px",borderRadius:"4px",letterSpacing:"1.5px"}}>NEW</span>
          )}
          {item.langType === "Dubbed Tamil" && (
            <span style={{background:`${C.orange}EE`,color:"#fff",fontSize:"8px",fontWeight:"800",padding:"2px 7px",borderRadius:"4px",letterSpacing:"0.5px",marginLeft:"auto"}}>DUBBED</span>
          )}
        </div>

        {/* OTT Platform badge — bottom left */}
        {(item.platforms||[]).length > 0 && (() => {
          const p = item.platforms[0];
          const m = PLATFORM_META[p];
          return m ? (
            <div style={{
              position:"absolute",bottom:"9px",left:"9px",
              display:"flex",alignItems:"center",gap:"5px",
              background:`${m.color}DD`,
              backdropFilter:"blur(4px)",
              padding:"3px 9px 3px 6px",
              borderRadius:"5px",
              boxShadow:`0 2px 8px rgba(0,0,0,0.5)`,
            }}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#fff",opacity:0.9,flexShrink:0}}/>
              <span style={{color:"#fff",fontSize:"10px",fontWeight:"800",letterSpacing:"0.3px",whiteSpace:"nowrap"}}>{p}</span>
            </div>
          ) : null;
        })()}

        {/* Rating — bottom right */}
        <div style={{position:"absolute",bottom:"9px",right:"9px",display:"flex",alignItems:"center",gap:"3px",background:"rgba(0,0,0,0.75)",padding:"3px 8px",borderRadius:"5px",backdropFilter:"blur(4px)"}}>
          <span style={{fontSize:"10px"}}>⭐</span>
          <span style={{color:C.gold,fontWeight:"800",fontSize:"12px",fontFamily:"'Fraunces',Georgia,serif"}}>{rating}</span>
        </div>
      </div>

      {/* Card body */}
      <div style={{padding:"12px 13px 14px",flex:1,display:"flex",flexDirection:"column",gap:"7px"}}>
        <h3 style={{
          fontSize:"13px",fontWeight:"700",lineHeight:"1.3",
          color:C.head,margin:0,
          fontFamily:"'Fraunces',Georgia,serif",
          display:"-webkit-box",WebkitLineClamp:2,
          WebkitBoxOrient:"vertical",overflow:"hidden",
        }}>{title}</h3>

        {/* Genre */}
        {genreNames.length > 0 && (
          <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
            {genreNames.map(g => (
              <span key={g} style={{fontSize:"10px",color:gc,fontWeight:"500"}}>{g}</span>
            ))}
          </div>
        )}

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"auto"}}>
          {/* Verdict badge based on rating */}
          {(() => {
            const r = parseFloat(item.vote_average);
            if (!r || r === 0) return <span style={{fontSize:"10px",color:C.muted}}>Not Rated</span>;
            const verdict = r >= 8.0 ? { label:"🔥 Must Watch", color:"#4ADE80", bg:"#4ADE8018" }
                          : r >= 7.0 ? { label:"👍 Watchable",  color:"#60A5FA", bg:"#60A5FA18" }
                          : r >= 6.0 ? { label:"😐 Average",    color:"#FBBF24", bg:"#FBBF2418" }
                          :            { label:"👎 Skip",        color:"#F87171", bg:"#F8717118" };
            return (
              <span style={{
                fontSize:"10px", fontWeight:"700",
                color: verdict.color, background: verdict.bg,
                border:`1px solid ${verdict.color}33`,
                padding:"2px 8px", borderRadius:"4px",
              }}>{verdict.label}</span>
            );
          })()}
          <span style={{fontSize:"10px",color:C.muted}}>{year}</span>
        </div>
      </div>
    </article>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function Modal({ item, genreMap, onClose, isMobile }) {
  const pm = PLATFORM_META[item.platforms?.[0]] || { color:"#888", dot:"#aaa", bg:"#111" };
  const title   = item.title || item.name || "Untitled";
  const poster  = item.poster_path ? `${IMG}${item.poster_path}` : null;
  const rating  = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
  const year    = (item.release_date || item.first_air_date || "").slice(0,4);
  const overview = item.overview || "No description available.";
  const genres  = (item.genre_ids||[]).map(id => genreMap[id]).filter(Boolean);

  useEffect(() => {
    const fn = e => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", fn);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", fn); };
  }, []);

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:9000,
      background:"rgba(0,0,0,0.88)",backdropFilter:"blur(18px)",
      display:"flex",alignItems:isMobile?"flex-end":"center",
      justifyContent:"center",padding:isMobile?"0":"24px",
      overflowY:"auto",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.surface,
        border:`1px solid ${pm.color}33`,
        borderRadius:isMobile?"20px 20px 0 0":"16px",
        width:"100%",maxWidth:isMobile?"100%":"620px",
        overflow:"hidden",
        boxShadow:`0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px ${pm.color}22`,
        animation:isMobile?"slideUp 0.3s ease":"popIn 0.28s cubic-bezier(0.34,1.4,0.64,1)",
        maxHeight:isMobile?"92vh":"90vh",overflowY:"auto",
      }}>
        {/* Gold accent line */}
        <div style={{height:"2px",background:`linear-gradient(90deg,${C.gold},${pm.color},transparent)`,flexShrink:0}}/>

        {isMobile && (
          <div style={{display:"flex",justifyContent:"center",padding:"10px 0 0",flexShrink:0}}>
            <div style={{width:"36px",height:"4px",background:C.border,borderRadius:"2px"}}/>
          </div>
        )}

        <div style={{display:"flex",flexDirection:isMobile?"column":"row"}}>
          {/* Poster side */}
          <div style={{
            width:isMobile?"100%":"220px",flexShrink:0,
            height:isMobile?"220px":"auto",
            position:"relative",overflow:"hidden",
            background:`linear-gradient(135deg,${pm.color}18,${C.base})`,
          }}>
            {poster
              ? <img src={poster} alt={title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"64px",color:pm.color,opacity:0.25}}>🎬</div>
            }
            <div style={{position:"absolute",inset:0,background:isMobile?"linear-gradient(to top,rgba(22,22,28,0.95) 0%,transparent 50%)":"linear-gradient(to right,transparent 60%,rgba(22,22,28,0.9) 100%)"}}/>
          </div>

          {/* Content side */}
          <div style={{flex:1,padding:"24px",display:"flex",flexDirection:"column",gap:"14px",minWidth:0}}>
            {/* Close */}
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <button onClick={onClose} style={{
                background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,
                color:C.muted,width:"30px",height:"30px",borderRadius:"6px",
                cursor:"pointer",fontSize:"14px",fontFamily:"inherit",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              }}>✕</button>
            </div>

            {/* Platform */}
            <div style={{display:"flex",gap:"6px",alignItems:"center",flexWrap:"wrap"}}>
              {(item.platforms||[]).map(p => {
                const m = PLATFORM_META[p];
                return m ? (
                  <span key={p} style={{
                    background:`${m.color}18`,border:`1px solid ${m.color}44`,
                    color:m.dot,fontSize:"11px",fontWeight:"700",
                    padding:"3px 10px",borderRadius:"5px",
                  }}>{p}</span>
                ) : null;
              })}
              <span style={{
                background:item.langType==="Original Tamil"?`${C.green}15`:`${C.orange}15`,
                border:`1px solid ${item.langType==="Original Tamil"?C.green:C.orange}35`,
                color:item.langType==="Original Tamil"?C.green:C.orange,
                fontSize:"11px",fontWeight:"600",padding:"3px 10px",borderRadius:"5px",
              }}>{item.langType==="Original Tamil"?"Original Tamil":"Dubbed Tamil"}</span>
            </div>

            {/* Title */}
            <h2 style={{
              fontSize:isMobile?"20px":"22px",fontWeight:"800",
              color:C.head,fontFamily:"'Fraunces',Georgia,serif",
              margin:0,lineHeight:"1.2",
            }}>{title}</h2>

            {/* Rating + year */}
            <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
              <span style={{
                background:`${C.gold}18`,border:`1px solid ${C.gold}44`,
                color:C.gold,fontSize:"14px",fontWeight:"800",
                padding:"4px 12px",borderRadius:"6px",
              }}>⭐ {rating}</span>
              <span style={{color:C.muted,fontSize:"13px"}}>{year}</span>
              <span style={{color:C.muted,fontSize:"13px"}}>{item.mediaType==="tv"?"Series":"Movie"}</span>
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                {genres.map(g => (
                  <span key={g} style={{
                    background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,
                    color:C.body,fontSize:"11px",padding:"2px 9px",borderRadius:"4px",
                  }}>{g}</span>
                ))}
              </div>
            )}

            {/* Overview */}
            <p style={{
              color:C.body,fontSize:"13px",lineHeight:"1.75",
              margin:0,fontStyle:"italic",
              borderLeft:`2px solid ${C.gold}`,paddingLeft:"13px",
            }}>{overview}</p>

            {/* Watch button */}
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(title+" watch in Tamil "+((item.platforms||[])[0]||""))}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display:"block",textAlign:"center",
                background:`linear-gradient(135deg,${C.gold},${C.gold2})`,
                color:"#0C0C10",padding:"13px",borderRadius:"9px",
                fontWeight:"800",fontSize:"14px",textDecoration:"none",
                letterSpacing:"0.3px",fontFamily:"inherit",marginTop:"auto",
              }}
            >Watch Now →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FILTER DRAWER (mobile) ───────────────────────────────────────────────────
function FilterDrawer({ filters, setFilters, onClose }) {
  const { platform, langType, mediaType, sortBy } = filters;
  const set = (k,v) => setFilters(f=>({...f,[k]:v}));
  useEffect(()=>{ document.body.style.overflow="hidden"; return()=>{ document.body.style.overflow=""; }; },[]);

  const Section = ({label,children}) => (
    <div style={{marginBottom:"18px"}}>
      <p style={{color:C.muted,fontSize:"10px",textTransform:"uppercase",letterSpacing:"1.5px",fontWeight:"600",marginBottom:"9px"}}>{label}</p>
      <div style={{display:"flex",gap:"7px",flexWrap:"wrap"}}>{children}</div>
    </div>
  );
  const Chip = ({label,active,onClick,dot}) => (
    <button onClick={onClick} style={{
      display:"inline-flex",alignItems:"center",gap:"5px",
      background:active?`${C.gold}18`:"transparent",
      border:`1px solid ${active?C.gold+"66":C.border}`,
      color:active?C.gold:C.muted,
      padding:"6px 13px",borderRadius:"6px",cursor:"pointer",
      fontSize:"12px",fontWeight:"600",whiteSpace:"nowrap",
      fontFamily:"inherit",WebkitTapHighlightColor:"transparent",
    }}>
      {dot&&<span style={{width:"6px",height:"6px",borderRadius:"50%",background:dot,flexShrink:0}}/>}
      {label}
    </button>
  );

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:8000,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end"}}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.surface,borderRadius:"20px 20px 0 0",
        border:`1px solid ${C.border}`,width:"100%",
        padding:"0 20px 36px",animation:"slideUp 0.3s ease",
        maxHeight:"82vh",overflowY:"auto",
      }}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 16px"}}>
          <div style={{width:"36px",height:"4px",background:C.border,borderRadius:"2px"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
          <span style={{color:C.head,fontWeight:"700",fontSize:"16px",fontFamily:"'Fraunces',Georgia,serif"}}>Filters</span>
          <button onClick={()=>setFilters({platform:"All",langType:"All",mediaType:"All",sortBy:"date"})} style={{background:"transparent",border:"none",color:C.gold,fontSize:"12px",cursor:"pointer",fontFamily:"inherit"}}>Clear all</button>
        </div>

        <Section label="Language">
          <Chip label="All"            active={langType==="All"}            onClick={()=>set("langType","All")}/>
          <Chip label="Tamil Original" active={langType==="Original Tamil"} onClick={()=>set("langType","Original Tamil")} dot={C.green}/>
          <Chip label="Dubbed Tamil"   active={langType==="Dubbed Tamil"}   onClick={()=>set("langType","Dubbed Tamil")}   dot={C.orange}/>
        </Section>

        <Section label="Type">
          <Chip label="All"    active={mediaType==="All"}   onClick={()=>set("mediaType","All")}/>
          <Chip label="Movies" active={mediaType==="movie"} onClick={()=>set("mediaType","movie")}/>
          <Chip label="Series" active={mediaType==="tv"}    onClick={()=>set("mediaType","tv")}/>
        </Section>

        <Section label="Platform">
          <Chip label="All" active={platform==="All"} onClick={()=>set("platform","All")}/>
          {Object.entries(PLATFORM_META).map(([p,m])=>(
            <Chip key={p} label={p} active={platform===p} onClick={()=>set("platform",p)} dot={m.dot}/>
          ))}
        </Section>

        <Section label="Sort By">
          {[["date","Latest First"],["rating","Top Rated"],["title","A – Z"]].map(([v,l])=>(
            <Chip key={v} label={l} active={sortBy===v} onClick={()=>set("sortBy",v)}/>
          ))}
        </Section>

        <button onClick={onClose} style={{
          width:"100%",marginTop:"8px",background:`linear-gradient(135deg,${C.gold},${C.gold2})`,
          color:"#0C0C10",border:"none",padding:"14px",borderRadius:"9px",
          fontWeight:"800",fontSize:"14px",cursor:"pointer",fontFamily:"inherit",
        }}>Apply</button>
      </div>
    </div>
  );
}

// ─── PILL ─────────────────────────────────────────────────────────────────────
function Pill({ label, active, onClick, dot }) {
  return (
    <button onClick={onClick} style={{
      display:"inline-flex",alignItems:"center",gap:"5px",
      background:active?`${C.gold}18`:"transparent",
      border:`1px solid ${active?C.gold+"66":C.border}`,
      color:active?C.gold:C.muted,
      padding:"5px 13px",borderRadius:"6px",cursor:"pointer",
      fontSize:"12px",fontWeight:"600",whiteSpace:"nowrap",
      transition:"all 0.15s",fontFamily:"inherit",
      WebkitTapHighlightColor:"transparent",
    }}>
      {dot&&<span style={{width:"6px",height:"6px",borderRadius:"50%",background:dot,flexShrink:0}}/>}
      {label}
    </button>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const { isMobile, isTablet } = useBreakpoint();
  const [allItems,      setAllItems]      = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [genreMap,      setGenreMap]      = useState({});
  const [loading,       setLoading]       = useState(true);
  const [searching,     setSearching]     = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [error,         setError]         = useState(null);
  const [page,          setPage]          = useState(1);
  const [hasMore,       setHasMore]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [showFilters,   setShowFilters]   = useState(false);
  const [search,        setSearch]        = useState("");
  const [searchFocus,   setSearchFocus]   = useState(false);
  const [filters,       setFilters]       = useState({ platform:"All", langType:"All", mediaType:"All", sortBy:"date" });
  const providerCache   = useRef({});
  const searchTimer     = useRef(null);

  // Load genres once
  useEffect(() => {
    fetchGenres().then(setGenreMap).catch(console.error);
  }, []);

  // Get providers in batches of 5 to avoid rate limiting
  const enrichWithProviders = useCallback(async (items) => {
    const results = [];
    const batchSize = 5;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(async item => {
        const cacheKey = `${item.mediaType}-${item.id}`;
        if (providerCache.current[cacheKey]) return { ...item, platforms: providerCache.current[cacheKey] };
        try {
          const platforms = await fetchProviders(item.id, item.mediaType);
          providerCache.current[cacheKey] = platforms;
          return { ...item, platforms };
        } catch {
          return { ...item, platforms: [] };
        }
      }));
      results.push(...batchResults);
      // Small pause between batches to avoid hitting rate limits
      if (i + batchSize < items.length) await new Promise(r => setTimeout(r, 200));
    }
    return results;
  }, []);

  // Initial load — show movies immediately, load platforms in background
  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        console.log("Fetching Tamil movies from TMDb...");
        const [mvData, tvData, dubData] = await Promise.all([
          fetchMovies(1), fetchSeries(1), fetchDubbed(1),
        ]);

        console.log("Movies:", mvData.results?.length, "Series:", tvData.results?.length, "Dubbed:", dubData.results?.length);

        const movies  = (mvData.results||[]).map(m => ({ ...m, mediaType:"movie", langType:"Original Tamil", platforms:[] }));
        const series  = (tvData.results||[]).map(t => ({ ...t, mediaType:"tv",    langType:"Original Tamil", platforms:[] }));
        const dubbed  = (dubData.results||[]).map(m => ({ ...m, mediaType:"movie", langType:"Dubbed Tamil",   platforms:[] }));

        const combined = [...movies, ...series, ...dubbed];

        // ✅ Show movies immediately — don't wait for providers
        setAllItems(combined);
        setHasMore(mvData.total_pages > 1);
        setLoading(false);

        // 🔄 Load platforms in background — update cards as they come in
        console.log("Loading platform data in background...");
        const batchSize = 5;
        for (let i = 0; i < combined.length; i += batchSize) {
          const batch = combined.slice(i, i + batchSize);
          const enriched = await Promise.all(batch.map(async item => {
            const cacheKey = `${item.mediaType}-${item.id}`;
            if (providerCache.current[cacheKey]) return { ...item, platforms: providerCache.current[cacheKey] };
            try {
              const platforms = await fetchProviders(item.id, item.mediaType);
              providerCache.current[cacheKey] = platforms;
              return { ...item, platforms };
            } catch { return { ...item, platforms:[] }; }
          }));
          // Merge enriched batch back into state
          setAllItems(prev => {
            const updated = [...prev];
            enriched.forEach(enrichedItem => {
              const idx = updated.findIndex(p => p.id === enrichedItem.id && p.mediaType === enrichedItem.mediaType);
              if (idx !== -1) updated[idx] = enrichedItem;
            });
            return updated;
          });
          if (i + batchSize < combined.length) await new Promise(r => setTimeout(r, 150));
        }
        console.log("All platform data loaded!");

      } catch (e) {
        console.error("TMDb fetch error:", e);
        setError(`API Error: ${e.message}`);
        setLoading(false);
      }
    })();
  }, []);

  // Load more
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const [mvData, tvData] = await Promise.all([fetchMovies(nextPage), fetchSeries(nextPage)]);
      const movies = (mvData.results||[]).map(m => ({ ...m, mediaType:"movie", langType:"Original Tamil" }));
      const series = (tvData.results||[]).map(t => ({ ...t, mediaType:"tv",    langType:"Original Tamil" }));
      const enriched = await enrichWithProviders([...movies,...series]);
      setAllItems(prev => {
        const ids = new Set(prev.map(i => `${i.mediaType}-${i.id}`));
        return [...prev, ...enriched.filter(i => !ids.has(`${i.mediaType}-${i.id}`))];
      });
      setPage(nextPage);
      setHasMore(nextPage < mvData.total_pages);
    } catch {}
    setLoadingMore(false);
  }, [page, hasMore, loadingMore, enrichWithProviders]);

  // Must be declared before displayed useMemo uses it
  const isSearchMode = search.trim().length > 0;

  // Filtered + sorted view — uses searchResults when typing, allItems otherwise
  const displayed = useMemo(() => {
    const source = isSearchMode ? searchResults : allItems;
    let r = source.filter(item => {
      if (!isSearchMode) {
        if (filters.platform  !== "All" && !(item.platforms||[]).includes(filters.platform)) return false;
        if (filters.langType  !== "All" && item.langType !== filters.langType)               return false;
        if (filters.mediaType !== "All" && item.mediaType !== filters.mediaType)             return false;
      }
      return true;
    });
    if (!isSearchMode) {
      if (filters.sortBy === "date")   r.sort((a,b) => new Date(b.release_date||b.first_air_date||0) - new Date(a.release_date||a.first_air_date||0));
      if (filters.sortBy === "rating") r.sort((a,b) => (b.vote_average||0) - (a.vote_average||0));
      if (filters.sortBy === "title")  r.sort((a,b) => (a.title||a.name||"").localeCompare(b.title||b.name||""));
    }
    return r;
  }, [allItems, searchResults, isSearchMode, filters]);

  // ── SEARCH: fires on every keystroke with 400ms debounce ──
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    clearTimeout(searchTimer.current);
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await searchTMDb(search.trim());
        const results = (data.results || [])
          .filter(r => ["movie","tv"].includes(r.media_type))
          .map(r => ({
            ...r,
            mediaType: r.media_type,
            langType: r.original_language === "ta" ? "Original Tamil" : "Dubbed Tamil",
            platforms: [],
          }));
        // Enrich with providers in background
        setSearchResults(results);
        setSearching(false);
        // Load platforms quietly
        const batchSize = 5;
        for (let i = 0; i < results.length; i += batchSize) {
          const batch = results.slice(i, i + batchSize);
          const enriched = await Promise.all(batch.map(async item => {
            try {
              const platforms = await fetchProviders(item.id, item.mediaType);
              return { ...item, platforms };
            } catch { return item; }
          }));
          setSearchResults(prev => {
            const updated = [...prev];
            enriched.forEach(e => {
              const idx = updated.findIndex(p => p.id === e.id && p.mediaType === e.mediaType);
              if (idx !== -1) updated[idx] = e;
            });
            return updated;
          });
          if (i + batchSize < results.length) await new Promise(r => setTimeout(r, 150));
        }
      } catch { setSearching(false); }
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const anyFilter = filters.platform!=="All"||filters.langType!=="All"||filters.mediaType!=="All";
  const px = isMobile ? "16px" : "28px";
  const gridCols = isMobile ? "repeat(2,1fr)" : isTablet ? "repeat(3,1fr)" : "repeat(auto-fill,minmax(195px,1fr))";

  return (
    <div style={{minHeight:"100vh",background:C.base,color:C.body,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:${C.gold}44;color:${C.head};}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:${C.base};}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        select option{background:${C.surface};color:${C.head};}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.6);}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        @keyframes popIn{from{opacity:0;transform:scale(0.91);}to{opacity:1;transform:scale(1);}}
        @keyframes slideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}
        @keyframes shimmer{0%{background-position:-400px 0;}100%{background-position:400px 0;}}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        a{text-decoration:none;}
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        position:"sticky",top:0,zIndex:500,
        background:`${C.base}F4`,backdropFilter:"blur(24px)",
        borderBottom:`1px solid ${C.border}`,
      }}>
        <div style={{maxWidth:"1400px",margin:"0 auto",padding:`0 ${px}`}}>

          {isMobile ? (
            <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 0 10px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <Logo size={28}/>
                  <div>
                    <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"19px",fontWeight:"900",color:C.head,letterSpacing:"-0.3px",lineHeight:1}}>OTT Padam</div>
                    <div style={{fontSize:"9px",color:C.muted,letterSpacing:"1.8px",textTransform:"uppercase",marginTop:"2px"}}>தமிழ் OTT Tracker</div>
                  </div>
                </div>
                <button onClick={()=>setShowFilters(true)} style={{
                  background:anyFilter?`${C.gold}18`:"rgba(255,255,255,0.05)",
                  border:`1px solid ${anyFilter?C.gold+"55":C.border}`,
                  color:anyFilter?C.gold:C.muted,
                  borderRadius:"8px",padding:"8px 13px",cursor:"pointer",
                  fontFamily:"inherit",fontSize:"12px",fontWeight:"600",
                  WebkitTapHighlightColor:"transparent",
                }}>⚙ {anyFilter?"Filtered":"Filter"}</button>
              </div>
              <div style={{paddingBottom:"11px"}}>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:"11px",top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:"14px",pointerEvents:"none"}}>⌕</span>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Tamil movies & series…"
                    style={{width:"100%",background:"#13131C",border:`1px solid ${searchFocus?C.gold+"77":C.border}`,borderRadius:"9px",padding:"10px 11px 10px 34px",color:C.head,fontSize:"13px",outline:"none",fontFamily:"inherit"}}
                    onFocus={()=>setSearchFocus(true)} onBlur={()=>setSearchFocus(false)}/>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"15px 0 13px",gap:"16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
                  <Logo/>
                  <div>
                    <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"22px",fontWeight:"900",color:C.head,letterSpacing:"-0.5px",lineHeight:1}}>OTT Padam</div>
                    <div style={{fontSize:"10px",color:C.muted,letterSpacing:"2px",textTransform:"uppercase",marginTop:"2px"}}>தமிழ் OTT Tracker</div>
                  </div>
                </div>
                <div style={{flex:1,maxWidth:"460px",position:"relative"}}>
                  <span style={{position:"absolute",left:"13px",top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:"15px",pointerEvents:"none"}}>⌕</span>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Tamil movies, series…"
                    style={{width:"100%",background:"#13131C",border:`1px solid ${searchFocus?C.gold+"77":C.border}`,borderRadius:"9px",padding:"9px 13px 9px 38px",color:C.head,fontSize:"13px",outline:"none",fontFamily:"inherit",transition:"border-color 0.2s"}}
                    onFocus={()=>setSearchFocus(true)} onBlur={()=>setSearchFocus(false)}/>
                  {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:"11px",top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"13px"}}>✕</button>}
                </div>
                <select value={filters.sortBy} onChange={e=>setFilters(f=>({...f,sortBy:e.target.value}))} style={{
                  background:"#13131C",border:`1px solid ${C.border}`,color:C.muted,
                  borderRadius:"9px",padding:"9px 12px",fontSize:"12px",cursor:"pointer",outline:"none",fontFamily:"inherit",flexShrink:0,
                }}>
                  <option value="date">Latest First</option>
                  <option value="rating">Top Rated</option>
                  <option value="title">A – Z</option>
                </select>
              </div>

              {/* Desktop filter pills */}
              <div style={{display:"flex",gap:"6px",paddingBottom:"12px",overflowX:"auto",alignItems:"center",flexWrap:"nowrap"}}>
                <Pill label="All"            active={filters.langType==="All"}            onClick={()=>setFilters(f=>({...f,langType:"All"}))}/>
                <Pill label="Tamil Original" active={filters.langType==="Original Tamil"} onClick={()=>setFilters(f=>({...f,langType:"Original Tamil"}))} dot={C.green}/>
                <Pill label="Dubbed Tamil"   active={filters.langType==="Dubbed Tamil"}   onClick={()=>setFilters(f=>({...f,langType:"Dubbed Tamil"}))}   dot={C.orange}/>
                <div style={{width:"1px",height:"16px",background:C.border,margin:"0 2px",flexShrink:0}}/>
                <Pill label="Movies" active={filters.mediaType==="movie"} onClick={()=>setFilters(f=>({...f,mediaType:f.mediaType==="movie"?"All":"movie"}))}/>
                <Pill label="Series" active={filters.mediaType==="tv"}    onClick={()=>setFilters(f=>({...f,mediaType:f.mediaType==="tv"?"All":"tv"}))}/>
                <div style={{width:"1px",height:"16px",background:C.border,margin:"0 2px",flexShrink:0}}/>
                {Object.entries(PLATFORM_META).map(([p,m])=>(
                  <Pill key={p} label={p} active={filters.platform===p} onClick={()=>setFilters(f=>({...f,platform:f.platform===p?"All":p}))} dot={m.dot}/>
                ))}
                {anyFilter&&<button onClick={()=>{setSearch("");setFilters({platform:"All",langType:"All",mediaType:"All",sortBy:"date"});}} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"12px",padding:"5px 8px",fontFamily:"inherit",textDecoration:"underline",whiteSpace:"nowrap"}}>Clear</button>}
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── STATS BAR ── */}
      <div style={{borderBottom:`1px solid ${C.border}`,background:C.surface}}>
        <div style={{maxWidth:"1400px",margin:"0 auto",padding:`9px ${px}`,display:"flex",gap:isMobile?"14px":"24px",overflowX:"auto",alignItems:"center"}}>
          {loading ? (
            <span style={{color:C.muted,fontSize:"12px",display:"flex",alignItems:"center",gap:"7px"}}>
              <span style={{width:"12px",height:"12px",border:`2px solid ${C.border}`,borderTopColor:C.gold,borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>
              Loading…
            </span>
          ) : isSearchMode ? (
            <span style={{color:C.muted,fontSize:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
              {searching
                ? <><span style={{width:"12px",height:"12px",border:`2px solid ${C.border}`,borderTopColor:C.gold,borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/> Searching…</>
                : <><span style={{color:C.gold,fontWeight:"700",fontSize:"16px",fontFamily:"'Fraunces',Georgia,serif"}}>{displayed.length}</span> results for &ldquo;{search}&rdquo; &mdash; all years, all platforms</>
              }
            </span>
          ) : (
            [
              {label:"On OTT",        value:allItems.length,  color:C.head},
              {label:"Showing",       value:displayed.length, color:C.gold},
              {label:"Original Tamil",value:allItems.filter(i=>i.langType==="Original Tamil").length, color:C.green},
              {label:"Dubbed Tamil",  value:allItems.filter(i=>i.langType==="Dubbed Tamil").length,   color:C.orange},
            ].map(s=>(
              <div key={s.label} style={{display:"flex",alignItems:"baseline",gap:"6px",whiteSpace:"nowrap"}}>
                <span style={{fontSize:"17px",fontWeight:"700",color:s.color,fontFamily:"'Fraunces',Georgia,serif",lineHeight:1}}>{s.value}</span>
                <span style={{fontSize:"10px",color:C.muted}}>{s.label}</span>
              </div>
            ))
          )}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"5px",flexShrink:0}}>
            <div style={{width:"6px",height:"6px",borderRadius:"50%",background:C.green,boxShadow:`0 0 6px ${C.green}`,animation:"pulse 2s ease infinite"}}/>
            <span style={{fontSize:"10px",color:C.muted}}>Live · TMDb</span>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      {!anyFilter && !isSearchMode && !loading && (
        <div style={{
          background:`linear-gradient(180deg, ${C.surface} 0%, transparent 100%)`,
          borderBottom:`1px solid ${C.border}`,
          padding: isMobile ? `24px ${px} 20px` : `32px ${px} 28px`,
          marginBottom:"4px",
        }}>
          <div style={{maxWidth:"1400px",margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"20px"}}>
            {/* Left — headline */}
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
                <div style={{height:"1px",width:"32px",background:C.gold,opacity:0.6}}/>
                <span style={{fontSize:"10px",color:C.gold,letterSpacing:"3px",textTransform:"uppercase",fontWeight:"600"}}>
                  Tamil Cinema on OTT
                </span>
              </div>
              <h1 style={{
                fontFamily:"'Fraunces',Georgia,serif",
                fontSize:isMobile?"clamp(24px,6vw,30px)":"clamp(28px,3vw,36px)",
                fontWeight:"900",color:C.head,lineHeight:"1.1",
                letterSpacing:"-0.5px",margin:0,
              }}>
                Your Tamil OTT<br/>
                <em style={{color:C.gold,fontStyle:"italic"}}>Watchlist, Simplified</em>
              </h1>
            </div>

            {/* Right — clickable platform pills (desktop only) */}
            {!isMobile && (
              <div style={{display:"flex",flexDirection:"column",gap:"8px",alignItems:"flex-end"}}>
                <span style={{fontSize:"10px",color:C.muted,letterSpacing:"1px",textTransform:"uppercase"}}>
                  Filter by platform
                </span>
                <div style={{display:"flex",gap:"7px",alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                  {Object.entries(PLATFORM_META).slice(0,7).map(([name,m])=>{
                    const isActive = filters.platform === name;
                    return (
                      <button
                        key={name}
                        onClick={()=>setFilters(f=>({...f, platform: f.platform===name ? "All" : name}))}
                        style={{
                          display:"flex", alignItems:"center", gap:"5px",
                          background: isActive ? `${m.color}28` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isActive ? m.color+"88" : m.color+"33"}`,
                          padding:"5px 12px", borderRadius:"20px",
                          cursor:"pointer", fontFamily:"inherit",
                          transition:"all 0.18s ease",
                          transform: isActive ? "scale(1.05)" : "scale(1)",
                          boxShadow: isActive ? `0 0 12px ${m.color}33` : "none",
                          WebkitTapHighlightColor:"transparent",
                        }}
                        onMouseEnter={e=>{
                          if(!isActive){
                            e.currentTarget.style.background=`${m.color}15`;
                            e.currentTarget.style.borderColor=`${m.color}66`;
                          }
                        }}
                        onMouseLeave={e=>{
                          if(!isActive){
                            e.currentTarget.style.background="rgba(255,255,255,0.04)";
                            e.currentTarget.style.borderColor=`${m.color}33`;
                          }
                        }}
                      >
                        <div style={{
                          width:"7px", height:"7px", borderRadius:"50%",
                          background: m.dot,
                          boxShadow: isActive ? `0 0 7px ${m.dot}` : "none",
                          flexShrink:0,
                        }}/>
                        <span style={{
                          fontSize:"11px",
                          color: isActive ? "#fff" : C.body,
                          fontWeight: isActive ? "700" : "500",
                        }}>{name}</span>
                        {isActive && (
                          <span style={{fontSize:"9px",color:m.dot,marginLeft:"1px"}}>✕</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GRID ── */}
      <main style={{maxWidth:"1400px",margin:"0 auto",padding:anyFilter?`18px ${px} 60px`:`0 ${px} 60px`}}>
        {error ? (
          <div style={{textAlign:"center",padding:"80px 20px"}}>
            <div style={{fontSize:"36px",marginBottom:"14px"}}>⚠️</div>
            <p style={{color:"#F87171",fontSize:"15px"}}>{error}</p>
          </div>
        ) : loading ? (
          <div style={{display:"grid",gridTemplateColumns:gridCols,gap:isMobile?"12px":"16px"}}>
            {Array.from({length:12}).map((_,i)=><SkeletonCard key={i}/>)}
          </div>
        ) : displayed.length === 0 && !searching ? (
          <div style={{textAlign:"center",padding:"80px 20px"}}>
            <div style={{fontSize:"36px",marginBottom:"14px",opacity:0.3}}>◎</div>
            <p style={{color:C.muted,fontSize:"15px",fontFamily:"'Fraunces',Georgia,serif"}}>
              {isSearchMode ? `No results found for "${search}"` : "No titles match your filters"}
            </p>
            {!isSearchMode && <button onClick={()=>setFilters({platform:"All",langType:"All",mediaType:"All",sortBy:"date"})} style={{marginTop:"14px",background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"8px 18px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>Clear all filters</button>}
          </div>
        ) : (
          <>
            <div style={{display:"grid",gridTemplateColumns:gridCols,gap:isMobile?"12px":"16px"}}>
              {displayed.map((item,i)=>(
                <MovieCard key={`${item.mediaType}-${item.id}`} item={item} genreMap={genreMap} onClick={setSelected} idx={i}/>
              ))}
            </div>

            {/* Load more — only in browse mode, not search */}
            {!isSearchMode && hasMore && (
              <div style={{textAlign:"center",marginTop:"36px"}}>
                <button onClick={loadMore} disabled={loadingMore} style={{
                  background:`${C.gold}15`,border:`1px solid ${C.gold}44`,
                  color:C.gold,padding:"11px 28px",borderRadius:"9px",cursor:"pointer",
                  fontSize:"13px",fontWeight:"600",fontFamily:"inherit",
                  opacity:loadingMore?0.6:1,
                }}>
                  {loadingMore ? "Loading…" : "Load More"}
                </button>
              </div>
            )}
            {/* Search hint */}
            {isSearchMode && (
              <div style={{textAlign:"center",marginTop:"24px"}}>
                <p style={{color:C.muted,fontSize:"12px"}}>
                  Searching across <strong style={{color:C.gold}}>all years</strong> on TMDb · Platform data loads in background
                </p>
                <button onClick={()=>setSearch("")} style={{marginTop:"10px",background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"7px 16px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>
                  ← Back to OTT browse
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{borderTop:`1px solid ${C.border}`,padding:`18px ${px}`}}>
        <div style={{maxWidth:"1400px",margin:"0 auto",display:"flex",alignItems:"center",gap:"10px"}}>
          <Logo size={22}/>
          <span style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:"800",color:C.head,fontSize:"14px"}}>OTT Padam</span>
          <span style={{color:C.border,fontSize:"11px"}}>· தமிழ் OTT Tracker</span>
        </div>
      </footer>

      {/* ── MODALS ── */}
      {selected    && <Modal item={selected} genreMap={genreMap} onClose={()=>setSelected(null)} isMobile={isMobile}/>}
      {showFilters && <FilterDrawer filters={filters} setFilters={setFilters} onClose={()=>setShowFilters(false)}/>}
    </div>
  );
}
