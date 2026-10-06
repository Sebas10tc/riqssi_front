/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import { useState } from 'react';
import { View } from './types';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import AnalysisView from './views/AnalysisView';
import ReportView from './views/ReportView';
import HistoryView from './views/HistoryView';
import UserManagementView from './views/UserManagementView';
import ResourcesView from './views/ResourcesView';
import PriceView from './views/PriceView';
import FAQView from './views/FAQView';
import ProfileView from './views/ProfileView';
import RegisterView from './views/RegisterView';
import RecoverPasswordView from './views/RecoverPasswordView';
import InstructionsSentView from './views/InstructionsSentView';
import UserDrawer from './components/UserDrawer';
import AccountDeletedModal from './components/AccountDeletedModal';
import { motion, AnimatePresence } from 'motion/react';
import { getExistingAnalysisReport } from './services/linkService';

const API_URL = import.meta.env.VITE_API_URL || 'https://riqssi-back.onrender.com';
const SESSION_STORAGE_KEY = 'riqssi.rememberedSession';

function readRememberedSession() {
  try {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) {
      return null;
    }

    const parsedSession = JSON.parse(rawSession);
    if (!parsedSession?.user) {
      return null;
    }

    if (parsedSession.user.accessToken) {
      sessionStorage.setItem('riqssi.accessToken', parsedSession.user.accessToken);
    }

    return parsedSession;
  } catch {
    return null;
  }
}

function storeRememberedSession(user) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user }));
  } catch {
    // Ignore storage errors; login still succeeds in memory.
  }
}

function clearRememberedSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function getThumbnailUrl(thumbnailPath) {
  if (!thumbnailPath) {
    return '';
  }

  if (/^https?:\/\//i.test(thumbnailPath)) {
    return thumbnailPath;
  }

  const normalizedPath = thumbnailPath.replace(/\\/g, '/');

  if (/^\/storage\//i.test(normalizedPath)) {
    return `${API_URL}${normalizedPath}`;
  }

  if (normalizedPath.toLowerCase().startsWith('storage/')) {
    return `${API_URL}/${normalizedPath}`;
  }

  const storageIndex = normalizedPath.toLowerCase().indexOf('/storage/');
  if (storageIndex >= 0) {
    return `${API_URL}${normalizedPath.slice(storageIndex)}`;
  }

  return `${API_URL}/${normalizedPath.replace(/^\/?/, '')}`;
}

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    const rememberedSession = readRememberedSession();
    return rememberedSession?.user ? View.DASHBOARD : View.LOGIN;
  });
  const [user, setUser] = useState(() => {
    const rememberedSession = readRememberedSession();
    return rememberedSession?.user || null;
  });
  const [analysisRequest, setAnalysisRequest] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [analysisError, setAnalysisError] = useState('');
  const [analysisThumbnailUrl, setAnalysisThumbnailUrl] = useState('');
  const [showAccountDeleted, setShowAccountDeleted] = useState(false);
  const handleLogin = (loggedUser, rememberMe = false) => {
    setUser(loggedUser);
    setAnalysisRequest(null);
    setAnalysisResult(null);
    setAnalysisStatus('idle');
    setAnalysisError('');
    setAnalysisThumbnailUrl('');
    if (rememberMe) {
      storeRememberedSession(loggedUser);
    } else {
      clearRememberedSession();
    }
    setCurrentView(View.DASHBOARD);
  };
    const handleLogout = () => {
    setUser(null);
    setAnalysisRequest(null);
    setAnalysisResult(null);
    setAnalysisStatus('idle');
    setAnalysisError('');
    setAnalysisThumbnailUrl('');
    clearRememberedSession();
    sessionStorage.removeItem('riqssi.accessToken');
    setCurrentView(View.LOGIN);
  };

  const handleAccountDeleted = () => {
    handleLogout();
    setShowAccountDeleted(true);
  };


  const handleStartAnalysis = (request) => {
    setAnalysisRequest(request);
    setAnalysisThumbnailUrl(getThumbnailUrl(request?.download?.video?.thumbnail_url || request?.download?.video?.thumbnail_path || ''));
    setAnalysisResult(null);
    setAnalysisError('');
    setAnalysisStatus('processing');
    setCurrentView(View.ANALYSIS);
  };

  const handleOpenHistoryReport = async (report) => {
    let reportWithDetails = report;
    const videoHash = report?.video?.hash_video;

    if (videoHash) {
      try {
        reportWithDetails = await getExistingAnalysisReport(videoHash, user?.nombreuser);
      } catch {
        // Usamos el resumen del historial como respaldo si el detalle no está disponible.
      }
    }

    const video = reportWithDetails?.video || {};
    const result = reportWithDetails?.resultado_total || null;

    setAnalysisRequest(null);
    setAnalysisThumbnailUrl(getThumbnailUrl(video.thumbnail_path || ''));
    setAnalysisResult({
      download: { video },
      videoAnalysis: result
        ? {
            confidence: result.video?.confianza != null ? `${Math.round(Number(result.video.confianza) * 100)}%` : '',
            fakeConfidence: result.video?.probabilidad_fake != null ? `${Math.round(Number(result.video.probabilidad_fake) * 100)}%` : '',
            verdict: result.video?.etiqueta || '',
          }
        : null,
      audioAnalysis: result
        ? {
            confidence: result.audio?.confianza != null ? `${Math.round(Number(result.audio.confianza) * 100)}%` : '',
            fakeConfidence: result.audio?.probabilidad_fake != null ? `${Math.round(Number(result.audio.probabilidad_fake) * 100)}%` : '',
            verdict: result.audio?.etiqueta || '',
          }
        : null,
      finalVerdict: result
        ? {
            veredicto_final: result.veredicto_final,
            etiqueta: result.etiqueta_final,
          }
        : null,
    });
    setCurrentView(View.REPORT);
  };

  const renderView = () => {
    switch (currentView) {
      case View.LOGIN:
        return <LoginView onLogin={handleLogin} setView={setCurrentView} />;
      case View.DASHBOARD:
        return <DashboardView setView={setCurrentView} user={user} onStartAnalysis={handleStartAnalysis} onOpenReport={handleOpenHistoryReport} />;
      case View.ANALYSIS:
        return (
          <AnalysisView
            setView={setCurrentView}
            user={user}
            analysisRequest={analysisRequest}
            setAnalysisRequest={setAnalysisRequest}
            analysisThumbnailUrl={analysisThumbnailUrl}
            analysisResult={analysisResult}
            setAnalysisResult={setAnalysisResult}
            analysisStatus={analysisStatus}
            setAnalysisStatus={setAnalysisStatus}
            analysisError={analysisError}
            setAnalysisError={setAnalysisError}
          />
        );
      case View.REPORT:
        return <ReportView analysisResult={analysisResult} user={user} />;
      case View.HISTORY:
        return <HistoryView setView={setCurrentView} user={user} onOpenReport={handleOpenHistoryReport} />;
      case View.FAQ:
        return <FAQView setView={setCurrentView} />;
      case View.USER_MANAGEMENT:
        return <UserManagementView user={user} />;
      case View.PRICE:
        return <PriceView setView={setCurrentView} user={user} />;
      case View.RESOURCES:
        return <ResourcesView />;
      case View.PROFILE:
        return <ProfileView onLogout={handleLogout} onAccountDeleted={handleAccountDeleted} user={user} />;
      case View.REGISTER:
        return <RegisterView setView={setCurrentView} />;
      case View.RECOVER_PASSWORD:
        return <RecoverPasswordView setView={setCurrentView} />;
      case View.INSTRUCTIONS_SENT:
        return <InstructionsSentView setView={setCurrentView} />;
      default:
        return <DashboardView setView={setCurrentView} />;
    }
  };

  const fitScreen = currentView === View.DASHBOARD || currentView === View.REPORT;

  return (
    <div className={`min-h-screen flex flex-col bg-[#f8fafc] font-sans selection:bg-blue-100 selection:text-blue-900 ${fitScreen ? 'lg:h-screen lg:overflow-hidden' : ''}`}>
      <Navbar
        currentView={currentView}
        setView={setCurrentView}
        user={user}
        onProfileClick={() => setIsDrawerOpen(true)}
      />
 
      <main className={`grow relative ${fitScreen ? 'lg:min-h-0 lg:overflow-hidden' : ''}`}>
        {currentView === View.ANALYSIS && analysisThumbnailUrl ? (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              alt="Video thumbnail preview"
              className="w-full h-full object-cover opacity-10 blur-[1px] scale-105"
              src={analysisThumbnailUrl}
            />
          </div>
        ) : null}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={fitScreen ? 'lg:h-full' : ''}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
 
      <Footer currentView={currentView} />
 
      {/* Slide-out User Menu / Profile Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <UserDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            currentView={currentView}
            setView={setCurrentView}
            onLogout={handleLogout}
            user={user}
          />
        )}
      </AnimatePresence>

      {showAccountDeleted ? <AccountDeletedModal onClose={() => setShowAccountDeleted(false)} /> : null}
    </div>
  );
}