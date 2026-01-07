import React, { useState, useEffect } from 'react';
import { Card, Spin, Tag, Button, Space, Collapse, Descriptions } from 'antd';
import { useParams } from 'react-router-dom';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { requirementService, recommendationService } from '../services/api';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);

const { Panel } = Collapse;

const Recommendations = () => {
  const { requirementId } = useParams();
  const [requirement, setRequirement] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [requirementId]);

  const loadData = async () => {
    try {
      const [reqRes, recsRes] = await Promise.all([
        requirementService.getById(requirementId),
        recommendationService.getByRequirement(requirementId)
      ]);
      
      setRequirement(reqRes.data);
      setRecommendations(recsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComponentColor = (type) => {
    const map = {
      frontend: 'blue',
      backend: 'green',
      database: 'purple'
    };
    return map[type] || 'default';
  };

  const getChangeTypeColor = (type) => {
    const map = {
      add: 'green',
      modify: 'orange',
      delete: 'red'
    };
    return map[type] || 'default';
  };

  const downloadReport = () => {
    const report = {
      requirement: requirement?.prompt,
      analysis: requirement?.analysis,
      recommendations: recommendations.map(rec => ({
        file: rec.file_path,
        type: rec.change_type,
        explanation: rec.explanation,
        code: rec.recommended_code
      }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recommendations_${requirementId}.json`;
    a.click();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" tip="Yükleniyor..." />
      </div>
    );
  }

  return (
    <div data-testid="recommendations-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Kod Değişiklik Önerileri</h1>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={downloadReport}
          disabled={recommendations.length === 0}
        >
          Raporu İndir
        </Button>
      </div>

      {requirement && (
        <Card title="İstek Özeti" style={{ marginBottom: 24 }}>
          <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, marginBottom: 16 }}>
            {requirement.prompt}
          </div>
          {requirement.analysis && (
            <Descriptions column={1}>
              <Descriptions.Item label="AI Analizi">
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>
                  {typeof requirement.analysis === 'string' 
                    ? requirement.analysis 
                    : JSON.stringify(requirement.analysis, null, 2)}
                </pre>
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>
      )}

      {recommendations.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <FileTextOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
            <div>Henüz öneri oluşturulmadı</div>
          </div>
        </Card>
      ) : (
        <div>
          <Card title={`Toplam ${recommendations.length} Öneri`} style={{ marginBottom: 16 }}>
            <Space>
              <Tag color="blue">Frontend: {recommendations.filter(r => r.component_type === 'frontend').length}</Tag>
              <Tag color="green">Backend: {recommendations.filter(r => r.component_type === 'backend').length}</Tag>
              <Tag color="purple">Database: {recommendations.filter(r => r.component_type === 'database').length}</Tag>
            </Space>
          </Card>

          <Collapse defaultActiveKey={[]} accordion>
            {recommendations.map((rec, idx) => (
              <Panel
                key={rec.id}
                header={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag color={getComponentColor(rec.component_type)}>
                      {rec.component_type.toUpperCase()}
                    </Tag>
                    <Tag color={getChangeTypeColor(rec.change_type)}>
                      {rec.change_type.toUpperCase()}
                    </Tag>
                    <span style={{ fontWeight: 'bold' }}>{rec.file_path}</span>
                    <Tag color="gold">
                      Güven: {(rec.confidence_score * 100).toFixed(0)}%
                    </Tag>
                  </div>
                }
              >
                <div className="recommendation-card">
                  <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="Açıklama">
                      {rec.explanation}
                    </Descriptions.Item>
                  </Descriptions>

                  {rec.original_code && (
                    <div className="code-diff">
                      <div className="original">
                        <div style={{ padding: '8px 12px', background: '#fff1f0', fontWeight: 'bold', borderBottom: '1px solid #ffccc7' }}>
                          Mevcut Kod
                        </div>
                        <SyntaxHighlighter language="javascript" style={docco}>
                          {rec.original_code}
                        </SyntaxHighlighter>
                      </div>
                      <div className="recommended">
                        <div style={{ padding: '8px 12px', background: '#f6ffed', fontWeight: 'bold', borderBottom: '1px solid #b7eb8f' }}>
                          Önerilen Kod
                        </div>
                        <SyntaxHighlighter language="javascript" style={docco}>
                          {rec.recommended_code}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  )}

                  {!rec.original_code && (
                    <div>
                      <div style={{ padding: '8px 12px', background: '#f6ffed', fontWeight: 'bold', marginBottom: 8 }}>
                        Önerilen Kod
                      </div>
                      <SyntaxHighlighter language="javascript" style={docco}>
                        {rec.recommended_code}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </div>
              </Panel>
            ))}
          </Collapse>
        </div>
      )}
    </div>
  );
};

export default Recommendations;
