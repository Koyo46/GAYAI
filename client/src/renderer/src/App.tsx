import { HashRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import Overlay from './Overlay'; // ※Overlay.tsxを作っていない場合は後で作成

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        {/* 通常起動時はダッシュボードを表示 */}
        <Route path="/" element={<Dashboard />} />
        
        {/* URLに #/overlay がある時はOBS用画面を表示 */}
        <Route path="/overlay" element={<Overlay />} />
      </Routes>
    </HashRouter>
  );
}

export default App;