import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import {
  Users, UserCheck, TrendingUp, TrendingDown,
  Info, Table, Loader2, RefreshCw, Edit3, LogOut,
  Calendar, Filter, ChevronDown
} from 'lucide-react';
import {
  Bar, XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, ComposedChart, Line, Tooltip as RechartsTooltip
} from 'recharts';

// ============================================
// ===== 案件設定（ここだけ変更してください） =====
// ============================================
const CONFIG = {
  TITLE: 'ポスティングHD LINEダッシュボード',
  CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfQ1RZ9t9PrVhly7wZdjy4z8y8H4GFzWEI-I-x1BaA5qHlLojO6dhB45kKyhx9rLIrxqD3r-9A2s_H/pub?gid=45431142&single=true&output=csv',
};
// ============================================

const COLORS = {
  primary: "#0067b8", secondary: "#00A4EF", success: "#107c10",
  warning: "#ffb900", danger: "#d13438", info: "#0078d4",
  muted: "#666666", accent: "#9bf00b",
  positive: "#0067b8",
  negative: "#d13438",
};

const PIE_COLORS = [
  "#0067b8", "#107c10", "#00A4EF", "#ffb900", "#d13438",
  "#0078d4", "#881798", "#00b294", "#e3008c", "#ff8c00", "#00188f"
];

const getSheetId = (url: string) => {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url;
};

const parseDate = (dateStr: any) => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s) return null;
  const match = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (match) {
    const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const normalized = s.replace(/^(\d{4}-\d{2}-\d{2})\s/, '$1T');
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
};

const formatMonth = (d: Date | null) => d ? `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月` : null;

const WEEK_START_DAY = 1; // 月曜開始
const getWeekRange = (d: Date | null) => {
  if (!d) return null;
  const day = d.getDay();
  const diff = (day - WEEK_START_DAY + 7) % 7;
  const start = new Date(d); start.setDate(d.getDate() - diff);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const fmt = (dt: Date) => `${dt.getMonth() + 1}月${dt.getDate()}日`;
  return `${start.getFullYear()}年${fmt(start)}〜${fmt(end)}`;
};

const formatDay = (d: Date | null) => d ? `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` : null;

const hasTag = (val: any) => { if (!val) return false; const s = String(val).trim(); return s !== '' && s !== '0'; };

const isTrue = (val: any) => { if (!val) return false; const s = String(val).trim(); return s === '1' || s === '１' || s.toLowerCase() === 'true'; };

const IconComp = ({ name, size = 18, className = "" }: any) => {
  const m: any = {
    'users': Users, 'user-check': UserCheck, 'trending-up': TrendingUp,
    'trending-down': TrendingDown, 'info': Info, 'table': Table, 'loader-2': Loader2,
    'refresh-cw': RefreshCw, 'edit-3': Edit3, 'log-out': LogOut
  };
  const I = m[name]; return I ? <I size={size} className={className} /> : null;
};

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="relative group inline-flex items-center ml-1.5 z-[100]">
    <Info size={14} className="text-[#666] cursor-help hover:text-[#0067b8] transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-[320px] bg-[#1a1a1a] text-white text-[12px] p-3 rounded-lg shadow-xl whitespace-pre-wrap leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-[100]">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1a1a1a]" />
    </div>
  </div>
);

const KPICard = ({ title, value, unit, icon, info, subText, change, changeLabel, isEditing }: any) => {
  return (
    <div className="card p-5 card-hover flex flex-col justify-between min-h-[120px]">
      <div className="flex justify-between items-start mb-3">
        <div className="p-2 rounded-lg bg-[#f2f2f2]">
          <IconComp name={icon} size={20} className="text-[#0067b8]" />
        </div>
      </div>
      <div>
        <h3 className="text-[#666] text-[11px] font-semibold tracking-wide uppercase mb-1 flex items-center">
          {title}{info && <InfoTooltip text={info} />}
        </h3>
        <div className="flex items-baseline gap-1.5">
          {isEditing ? (
            <input 
              type="text" 
              defaultValue={value} 
              className="text-[32px] font-bold text-[#000] tracking-tight leading-none w-24 border-b border-[#0067b8] focus:outline-none"
            />
          ) : (
            <span className="text-[32px] font-bold text-[#000] tracking-tight leading-none">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
          )}
          <span className="text-[#666] text-xs font-semibold">{unit}</span>
        </div>
        {change != null && !isNaN(change) && (
          <div className="flex items-center gap-1 mt-1.5">
            <IconComp name={change >= 0 ? 'trending-up' : 'trending-down'} size={12}
              className={change >= 0 ? 'text-[#0067b8]' : 'text-[#d13438]'} />
            <span className={`text-[11px] font-bold ${change >= 0 ? 'text-[#0067b8]' : 'text-[#d13438]'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
            {changeLabel && <span className="text-[10px] text-[#666] ml-0.5">{changeLabel}</span>}
          </div>
        )}
        {change == null && (
          <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-[#666]">
            — <span className="text-[10px] text-[#666] ml-0.5">{changeLabel}</span>
          </div>
        )}
        {subText && <p className="text-[11px] text-[#666] mt-1">{subText}</p>}
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-4 rounded-lg shadow-xl border border-[#f2f2f2] text-xs">
      <p className="font-semibold text-[#000] mb-2 text-sm">{label}</p>
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-[#666]">{e.name}:</span>
          <span className="font-bold text-[#000]">{e.value?.toLocaleString() || 0}{e.name.includes('率') ? '%' : ''}</span>
        </div>
      ))}
    </div>
  );
};

function fetchSheetData() {
  return new Promise<any[]>((resolve, reject) => {
    Papa.parse(CONFIG.CSV_URL, {
      download: true, header: true, skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (r) => resolve(r.data), error: (e) => reject(e)
    });
  });
}

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [periodType, setPeriodType] = useState<'month' | 'week' | 'day'>('week');
  const [isEditing, setIsEditing] = useState(false);
  const [scenarioTab, setScenarioTab] = useState<'A' | 'B'>('A');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 50;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isEditing) {
      window.onbeforeunload = () => "変更が失われます";
    } else {
      window.onbeforeunload = null;
    }
    return () => { window.onbeforeunload = null; };
  }, [isEditing]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchSheetData();
      setData(d);
    } catch (e: any) {
      setError(e.message || 'データ取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const dashboardData = useMemo(() => {
    if (!data.length) return null;

    // 前処理（パーサー）
    let items = data.map(row => {
      const addedDate = parseDate(row['友だち追加日時'] || row['流入日時(新規)']);
      return {
        ...row,
        _addedDate: addedDate,
        _month: formatMonth(addedDate),
        _week: getWeekRange(addedDate),
        _day: formatDay(addedDate),
      };
    }).filter(r => r._addedDate); // 日付がないものは除外（エラー行防止）

    // フィルタリング適用 (期間)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateRangeFilter !== 'all') {
      items = items.filter(r => {
        const d = r._addedDate;
        if (!d) return false;
        
        if (dateRangeFilter === 'this_month') {
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }
        if (dateRangeFilter === 'last_month') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth();
        }
        if (dateRangeFilter === 'last_7_days') {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          return d >= sevenDaysAgo;
        }
        if (dateRangeFilter === 'last_30_days') {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          return d >= thirtyDaysAgo;
        }
        return true;
      });
    }

    // フィルタリング適用 (流入経路)
    if (sourceFilter !== 'all') {
      items = items.filter(r => hasTag(r[sourceFilter]));
    }

    const availableSources = Object.keys(data[0] || {}).filter(k => k.startsWith('【流入経路】') || k.includes('流入経路_'));

    // 総登録、アクティブ
    const totalCount = items.length; // ブロックカラムがないためアクティブ一致
    const activeCount = totalCount;

    // CV
    const cv1Count = items.filter(r => isTrue(r['【完了】ポスティンガー(配布員)面談予約'])).length;
    const cv2Count = items.filter(r => isTrue(r['【完了】現場研修_日程調整フォーム提出'])).length;
    
    // 時系列集計
    const timeGroups: Record<string, any[]> = {};
    items.forEach(r => {
      const key = periodType === 'month' ? r._month : periodType === 'week' ? r._week : r._day;
      if (key) {
        if (!timeGroups[key]) timeGroups[key] = [];
        timeGroups[key].push(r);
      }
    });

    const sortedPeriods = Object.keys(timeGroups).sort();
    const periodDataList = sortedPeriods.map(period => {
      const rows = timeGroups[period];
      const cv1 = rows.filter(r => isTrue(r['【完了】ポスティンガー(配布員)面談予約'])).length;
      const cv2 = rows.filter(r => isTrue(r['【完了】現場研修_日程調整フォーム提出'])).length;
      return {
        period,
        count: rows.length,
        cv1,
        cv2,
        cv1Rate: rows.length ? (cv1 / rows.length) * 100 : 0,
        rows
      };
    });

    // 最新期間の計算用（前期比用）
    const latestPeriodData = periodDataList[periodDataList.length - 1];
    const prevPeriodData = periodDataList[periodDataList.length - 2];

    const calcChange = (val1?: number, val2?: number) => {
      if (val1 == null || val2 == null || val2 === 0) return null;
      return ((val1 - val2) / val2) * 100;
    };

    const changeLabel = periodType === 'month' ? '前月比' : periodType === 'week' ? '前週比' : '前日比';

    const latestRegCount = latestPeriodData?.count || 0;
    const prevRegCount = prevPeriodData?.count || 0;
    
    return {
      totalCount, activeCount, cv1Count, cv2Count,
      periodDataList,
      latestPeriodData,
      prevPeriodData,
      latestRegCount, prevRegCount,
      changeLabel,
      calcChange,
      availableSources
    };

  }, [data, periodType, dateRangeFilter, sourceFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <IconComp name="loader-2" size={32} className="animate-spin text-[#0067b8] mb-4" />
        <p className="text-[#666]">データを読み込んでいます...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
        <p className="text-[#d13438] mb-4 p-4 bg-[#fde7e9] rounded-lg">{error}</p>
        <button onClick={loadData} className="btn-primary">再読み込み</button>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { totalCount, activeCount, cv1Count, cv2Count, periodDataList, changeLabel, calcChange, latestPeriodData, prevPeriodData, availableSources } = dashboardData;

  const cv1Rate = activeCount ? ((cv1Count / activeCount) * 100) : 0;
  const cv2Rate = activeCount ? ((cv2Count / activeCount) * 100) : 0;

  let currentCv1Rate = latestPeriodData?.rows.length ? (latestPeriodData.cv1 / latestPeriodData.rows.length) * 100 : 0;
  let prevCv1Rate = prevPeriodData?.rows.length ? (prevPeriodData.cv1 / prevPeriodData.rows.length) * 100 : 0;

  // ファネルテーブルの定義作成
  const scenarioStepsA = [
    { name: '1通目', target: '【A対象者】1通目_登録直後', tap: '【Aタップ】1通目_まずは話を聞く' },
    { name: '2通目', target: '【A対象者】2通目_30分後', tap: '【Aタップ】2通目_まずは話を聞く' },
    { name: '3通目', target: '【A対象者】3通目_1日後8:02', tap: '【Aタップ】3通目_まずは話を聞く' },
    { name: '4通目', target: '【A対象者】4通目_1日後19:03', tap: '【Aタップ】4通目_まずは話を聞く' },
    { name: '5通目', target: '【A対象者】5通目_3日後16時', tap: '【Aタップ】5通目_まずは話を聞く' },
  ];
  
  const scenarioStepsB = [
    { name: '1通目', target: '【B対象者】1通目_登録直後', tap: '【Bタップ】1通目_まずは話を聞く' },
    { name: '2通目', target: '【B対象者】2通目_30分後', tap: '【Bタップ】2通目_まずは話を聞く' },
    { name: '3通目', target: '【B対象者】3通目_1日後8:02', tap: '【Bタップ】3通目_まずは話を聞く' },
    { name: '4通目', target: '【B対象者】4通目_1日後19:03', tap: '【Bタップ】4通目_まずは話を聞く' },
    { name: '5通目', target: '【B対象者】5通目_3日後16時', tap: '【Bタップ】5通目_まずは話を聞く' },
  ];

  const currentSteps = scenarioTab === 'A' ? scenarioStepsA : scenarioStepsB;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#000] tracking-tight">{CONFIG.TITLE}</h1>
          <p className="text-sm text-[#666] mt-1 flex items-center gap-2">
            有効データ: {activeCount}件 / 全データ: {totalCount}件
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* 追加: 期間フィルター */}
          <div className="relative group/filter">
            <div className="flex items-center gap-2 bg-[#0067b8] text-white px-3 py-2 rounded-lg cursor-pointer text-sm font-semibold">
              <Calendar size={16} />
              <span>
                {dateRangeFilter === 'this_month' ? '今月' :
                 dateRangeFilter === 'last_month' ? '先月' :
                 dateRangeFilter === 'last_7_days' ? '過去7日間' :
                 dateRangeFilter === 'last_30_days' ? '過去30日間' : '全期間'}
              </span>
              <ChevronDown size={14} className="ml-1" />
            </div>
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#f2f2f2] rounded-lg shadow-lg py-1 w-40 hidden group-hover/filter:block z-50">
              {[
                { val: 'all', label: '全期間' },
                { val: 'this_month', label: '今月' },
                { val: 'last_month', label: '先月' },
                { val: 'last_7_days', label: '過去7日間' },
                { val: 'last_30_days', label: '過去30日間' }
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setDateRangeFilter(opt.val)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-[#f2f2f2] transition-colors ${dateRangeFilter === opt.val ? 'font-bold text-[#0067b8]' : 'text-[#000]'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 追加: 流入経路フィルター */}
          <div className="relative group/filter-source">
            <div className="flex items-center gap-2 bg-white border border-[#d2d2d2] px-3 py-2 rounded-lg cursor-pointer text-sm font-semibold">
              <Filter size={16} className="text-[#666]" />
              <span>
                {sourceFilter === 'all' ? '全流入経路' : sourceFilter.replace('【流入経路】', '').replace('流入経路_', '')}
              </span>
              <ChevronDown size={14} className="ml-1 text-[#666]" />
            </div>
            <div className="absolute top-full right-0 mt-1 bg-white border border-[#f2f2f2] rounded-lg shadow-lg py-1 w-56 hidden group-hover/filter-source:block z-50 max-h-64 overflow-y-auto">
              <button
                onClick={() => setSourceFilter('all')}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-[#f2f2f2] transition-colors ${sourceFilter === 'all' ? 'font-bold text-[#0067b8]' : 'text-[#000]'}`}
              >
                全流入経路
              </button>
              {availableSources.map((src: string) => (
                <button
                  key={src}
                  onClick={() => setSourceFilter(src)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-[#f2f2f2] transition-colors ${sourceFilter === src ? 'font-bold text-[#0067b8]' : 'text-[#000]'}`}
                >
                  {src.replace('【流入経路】', '').replace('流入経路_', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex bg-[#f2f2f2] rounded-lg p-1 ml-2">
            {['month', 'week', 'day'].map((pt) => {
              const labels: Record<string, string> = { month: '月次', week: '週次', day: '日次' };
              return (
                <button
                  key={pt}
                  onClick={() => setPeriodType(pt as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${periodType === pt ? 'bg-white shadow-sm text-[#000]' : 'text-[#666] hover:text-[#000]'}`}
                >
                  {labels[pt]}
                </button>
              );
            })}
          </div>
          <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-[#0067b8] text-white' : 'bg-[#f2f2f2] text-[#666] hover:bg-[#e2e2e2]'}`}>
            <IconComp name="edit-3" size={18} />
          </button>
          <button onClick={loadData} className="p-2 rounded-lg bg-[#f2f2f2] text-[#666] hover:bg-[#e2e2e2] transition-colors">
            <IconComp name="refresh-cw" size={18} />
          </button>
        </div>
      </div>
      
      {isEditing && (
        <div className="bg-[#fff4ce] border border-[#ffb900] text-[#000] p-3 rounded-lg text-sm font-semibold flex items-center gap-2">
          <IconComp name="info" size={16} className="text-[#ffb900]"/>
          編集モード: KPIカードの数値を一時的に書き換えられます。（リロードで元に戻ります）
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="総登録数" value={totalCount} unit="人" icon="users" isEditing={isEditing}
          info="全ての登録者数（CSVの全行数）"
          change={calcChange(latestPeriodData?.count, prevPeriodData?.count)}
          changeLabel={changeLabel}
        />
        <KPICard
          title="アクティブ数" value={activeCount} unit="人" icon="user-check" isEditing={isEditing}
          info="ブロックされていないユーザー数（今回はブロックデータなしのため総登録数と同じ）"
        />
        <KPICard
          title="ポスティンガー面談予約" value={cv1Count} unit={`人 (${cv1Rate.toFixed(1)}%)`} icon="trending-up" isEditing={isEditing}
          info="「【完了】ポスティンガー(配布員)面談予約」が1のユーザー"
          change={calcChange(currentCv1Rate, prevCv1Rate)}
          changeLabel={`成約率 ${changeLabel} (pt)`}
        />
        <KPICard
          title="現場研修フォーム提出" value={cv2Count} unit={`人 (${cv2Rate.toFixed(1)}%)`} icon="trending-up" isEditing={isEditing}
          info="「【完了】現場研修_日程調整フォーム提出」が1のユーザー"
        />
      </div>

      {/* Funnel Matrix Table */}
      <div className="card overflow-hidden mt-6">
        <div className="p-4 border-b border-[#f2f2f2] flex justify-between items-center">
          <h2 className="text-[16px] font-semibold text-[#000]">ファネル集計（シナリオ別）</h2>
          <div className="flex gap-2">
            <button onClick={() => setScenarioTab('A')} className={`btn-secondary ${scenarioTab === 'A' ? 'active' : ''}`}>シナリオA</button>
            <button onClick={() => setScenarioTab('B')} className={`btn-secondary ${scenarioTab === 'B' ? 'active' : ''}`}>シナリオB</button>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm min-w-[800px]">
             <thead>
               <tr className="bg-[#f2f2f2] text-[#666]">
                 <th className="p-3 sticky left-0 bg-[#f2f2f2] z-10 border-b border-[#d2d2d2]" rowSpan={2}>期間</th>
                 {currentSteps.map(step => (
                   <th key={step.name} colSpan={3} className="p-2 border-l-2 border-[#d2d2d2] text-center border-b font-semibold">
                     {step.name} 
                   </th>
                 ))}
                 <th className="p-2 border-l-2 border-[#d2d2d2] text-center border-b font-semibold" colSpan={4}>全体</th>
               </tr>
               <tr className="bg-[#fafafa] text-[#666] text-xs">
                 {currentSteps.map((step, i) => (
                   <React.Fragment key={i}>
                     <th className="p-2 border-l-2 border-[#d2d2d2] border-b text-center font-normal">対象</th>
                     <th className="p-2 border-b text-center font-normal">Tap</th>
                     <th className="p-2 border-b text-center font-normal">率</th>
                   </React.Fragment>
                 ))}
                 <th className="p-2 border-l-2 border-[#d2d2d2] border-b text-center font-normal">CV1</th>
                 <th className="p-2 border-b text-center font-normal">CV1率</th>
                 <th className="p-2 border-b text-center font-normal">CV2</th>
                 <th className="p-2 border-b text-center font-normal">CV2率</th>
               </tr>
             </thead>
             <tbody>
               <tr className="bg-[#f9f9f9] font-semibold text-[#000]">
                 <td className="p-3 sticky left-0 z-10 bg-[#f9f9f9] border-b border-[#f2f2f2]">全体合計</td>
                 {currentSteps.map((step, i) => {
                   const targets = data.filter(r => isTrue(r[step.target])).length;
                   const taps = data.filter(r => isTrue(r[step.tap])).length;
                   const rate = targets ? (taps / targets) * 100 : 0;
                   return (
                     <React.Fragment key={i}>
                       <td className="p-3 border-l-2 border-[#d2d2d2] text-center">{targets}</td>
                       <td className="p-3 text-center">{taps}</td>
                       <td className={`p-3 text-center ${rate >= 20 ? 'text-[#0067b8]' : rate < 5 ? 'text-[#d13438]' : ''}`}>{rate.toFixed(1)}%</td>
                     </React.Fragment>
                   );
                 })}
                 <td className="p-3 border-l-2 border-[#d2d2d2] text-center font-bold text-[#0067b8]">{cv1Count}</td>
                 <td className="p-3 text-center font-bold text-[#0067b8]">{cv1Rate.toFixed(1)}%</td>
                 <td className="p-3 text-center font-bold">{cv2Count}</td>
                 <td className="p-3 text-center font-bold">{cv2Rate.toFixed(1)}%</td>
               </tr>
               {periodDataList.map((pd, idx) => (
                 <tr key={idx} className="border-b border-[#f2f2f2] hover:bg-[#fafafa]">
                   <td className="p-3 sticky left-0 z-10 bg-white border-r border-[#f2f2f2]">{pd.period}</td>
                   {currentSteps.map((step, i) => {
                     const targets = pd.rows.filter(r => isTrue(r[step.target])).length;
                     const taps = pd.rows.filter(r => isTrue(r[step.tap])).length;
                     const rate = targets ? (taps / targets) * 100 : 0;
                     return (
                       <React.Fragment key={i}>
                         <td className="p-3 border-l-2 border-[#d2d2d2] text-center text-[#666]">{targets}</td>
                         <td className="p-3 text-center text-[#666]">{taps}</td>
                         <td className="p-3 text-center text-[#666]">{rate.toFixed(1)}%</td>
                       </React.Fragment>
                     );
                   })}
                   <td className="p-3 border-l-2 border-[#f2f2f2] text-center font-semibold">{pd.cv1}</td>
                   <td className="p-3 text-center text-[#0067b8] font-semibold">{pd.rows.length ? ((pd.cv1 / pd.rows.length)*100).toFixed(1) : '0.0'}%</td>
                   <td className="p-3 text-center">{pd.cv2}</td>
                   <td className="p-3 text-center text-[#0067b8] font-semibold">{pd.rows.length ? ((pd.cv2 / pd.rows.length)*100).toFixed(1) : '0.0'}%</td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="card p-6 flex flex-col h-[400px]">
          <h2 className="text-[16px] font-semibold mb-4 text-[#000]">登録数とCV数の推移 ({periodType === 'month' ? '月次' : periodType === 'week' ? '週次' : '日次'})</h2>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={periodDataList} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f2f2" />
              <XAxis dataKey="period" tick={{ fill: '#666', fontSize: 11 }} tickMargin={10} minTickGap={10} />
              <YAxis yAxisId="left" tick={{ fill: '#666', fontSize: 11 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#666' }} />
              <Bar yAxisId="left" dataKey="count" name="登録数" fill="#f2f2f2" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="cv1" name="面談予約(CV1)" fill="#0067b8" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6 flex flex-col h-[400px]">
          <h2 className="text-[16px] font-semibold mb-4 text-[#000]">流入経路 割合</h2>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              {(() => {
                const routes = Object.keys(data[0] || {}).filter(k => k.startsWith('【流入経路】') || k.includes('流入経路_'));
                let routeData = routes.map(rt => {
                  const c = data.filter(r => hasTag(r[rt])).length;
                  return { name: rt.replace('【流入経路】', '').replace('流入経路_', ''), value: c };
                }).filter(r => r.value > 0).sort((a,b) => b.value - a.value).slice(0, 8); // 上位8件のみ
                
                return (
                  <>
                    <Pie data={routeData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={2} dataKey="value">
                      {routeData.map((e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </>
                );
              })()}
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Raw Data Table */}
      <div className="card overflow-hidden mt-6">
        <div className="p-4 border-b border-[#f2f2f2] flex justify-between items-center">
          <h2 className="text-[16px] font-semibold text-[#000]">生データ（全カラム）</h2>
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <span>{data.length}件中 {(page - 1) * ROWS_PER_PAGE + 1} - {Math.min(page * ROWS_PER_PAGE, data.length)}件</span>
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-2 py-1 rounded bg-[#f2f2f2] disabled:opacity-50 text-[#000]">前へ</button>
            <button disabled={page * ROWS_PER_PAGE >= data.length} onClick={() => setPage(page + 1)} className="px-2 py-1 rounded bg-[#f2f2f2] disabled:opacity-50 text-[#000]">次へ</button>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left whitespace-nowrap min-w-max">
            <thead className="bg-[#f2f2f2] text-[#666] font-semibold text-[12px]">
              <tr>
                {data.length > 0 && Object.keys(data[0]).filter(k => !k.startsWith('_')).map(k => (
                  <th key={k} className="p-3 border-b">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[#000] text-[13px]">
              {data.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE).map((row, i) => (
                <tr key={i} className="hover:bg-[#f9f9f9] border-b border-[#f2f2f2] last:border-b-0">
                  {Object.keys(row).filter(k => !k.startsWith('_')).map(k => (
                    <td key={k} className="p-3 truncate max-w-[200px]">{row[k]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
