import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import trTR from 'antd/locale/tr_TR';
import Dashboard from './pages/Dashboard';
import CodeAnalysis from './pages/CodeAnalysis';
import CodeMap from './pages/CodeMap';
import RequirementAnalysis from './pages/RequirementAnalysis';
import AgentWorkflow from './pages/AgentWorkflow';
import Recommendations from './pages/Recommendations';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={trTR}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analysis" element={<CodeAnalysis />} />
            <Route path="/code-map/:projectId" element={<CodeMap />} />
            <Route path="/requirement/:projectId" element={<RequirementAnalysis />} />
            <Route path="/agents/:requirementId" element={<AgentWorkflow />} />
            <Route path="/recommendations/:requirementId" element={<Recommendations />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
