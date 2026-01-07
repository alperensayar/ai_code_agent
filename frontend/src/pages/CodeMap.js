import React, { useState, useEffect } from 'react';
import { Card, Tree, Descriptions, Tag, Spin, Row, Col, Statistic, Button, Tabs } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FolderOutlined,
  FileOutlined,
  FunctionOutlined,
  ApiOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { projectService, codeMapService } from '../services/api';

const CodeMap = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [codeMaps, setCodeMaps] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (project?.status === 'analyzing') {
        loadData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectRes, codeMapsRes, summaryRes] = await Promise.all([
        projectService.getById(projectId),
        codeMapService.getByProject(projectId),
        codeMapService.getSummary(projectId)
      ]);
      
      setProject(projectRes.data);
      setCodeMaps(codeMapsRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTreeData = () => {
    const tree = {};
    
    codeMaps.forEach(cm => {
      const parts = cm.file_path.split('/');
      let current = tree;
      
      parts.forEach((part, idx) => {
        if (!current[part]) {
          current[part] = {
            key: cm.file_path + idx,
            title: part,
            icon: idx === parts.length - 1 ? <FileOutlined /> : <FolderOutlined />,
            children: {},
            isFile: idx === parts.length - 1,
            data: idx === parts.length - 1 ? cm : null
          };
        }
        current = current[part].children;
      });
    });
    
    const convertToArray = (obj) => {
      return Object.values(obj).map(item => ({
        ...item,
        children: Object.keys(item.children).length > 0 ? convertToArray(item.children) : undefined
      }));
    };
    
    return convertToArray(tree);
  };

  const onSelect = (selectedKeys, info) => {
    if (info.node.isFile && info.node.data) {
      setSelectedFile(info.node.data);
    }
  };

  if (loading && !project) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" tip="Yükleniyor..." />
      </div>
    );
  }

  return (
    <div data-testid="code-map-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>{project?.name} - Kod Haritası</h1>
        <div>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
            style={{ marginRight: 8 }}
          >
            Yenile
          </Button>
          <Button
            type="primary"
            onClick={() => navigate(`/requirement/${projectId}`)}
            disabled={project?.status !== 'completed'}
          >
            İstek Analizi Yap
          </Button>
        </div>
      </div>

      {project?.status === 'analyzing' && (
        <Card style={{ marginBottom: 16, background: '#fff7e6', borderColor: '#ffa940' }}>
          <Spin /> Analiz devam ediyor... Sayfa otomatik olarak güncelleniyor.
        </Card>
      )}

      {summary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Toplam Dosya"
                value={summary.total_files}
                prefix={<FileOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Toplam Fonksiyon"
                value={summary.total_functions}
                prefix={<FunctionOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Toplam Sınıf"
                value={summary.total_classes}
                prefix={<ApiOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Toplam Satır"
                value={summary.total_lines}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Dosya Yapısı" style={{ height: 'calc(100vh - 400px)', overflowY: 'auto' }}>
            <Tree
              showIcon
              defaultExpandAll={false}
              treeData={buildTreeData()}
              onSelect={onSelect}
            />
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card title="Detaylar" style={{ height: 'calc(100vh - 400px)', overflowY: 'auto' }}>
            {selectedFile ? (
              <Tabs
                items={[
                  {
                    key: 'overview',
                    label: 'Genel Bakış',
                    children: (
                      <Descriptions bordered column={1}>
                        <Descriptions.Item label="Dosya Yolu">{selectedFile.file_path}</Descriptions.Item>
                        <Descriptions.Item label="Dosya Tipi">
                          <Tag color="blue">{selectedFile.file_type}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Satır Sayısı">{selectedFile.line_count}</Descriptions.Item>
                        <Descriptions.Item label="Fonksiyon Sayısı">{selectedFile.functions?.length || 0}</Descriptions.Item>
                        <Descriptions.Item label="Sınıf Sayısı">{selectedFile.classes?.length || 0}</Descriptions.Item>
                        <Descriptions.Item label="Import Sayısı">{selectedFile.imports?.length || 0}</Descriptions.Item>
                      </Descriptions>
                    )
                  },
                  {
                    key: 'functions',
                    label: `Fonksiyonlar (${selectedFile.functions?.length || 0})`,
                    children: (
                      <div>
                        {selectedFile.functions?.map((func, idx) => (
                          <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                            <strong>{func.name}</strong>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              Satır: {func.line_start} - {func.line_end}
                              {func.args && ` | Parametreler: ${func.args.join(', ')}`}
                            </div>
                            {func.docstring && (
                              <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                                {func.docstring}
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    )
                  },
                  {
                    key: 'classes',
                    label: `Sınıflar (${selectedFile.classes?.length || 0})`,
                    children: (
                      <div>
                        {selectedFile.classes?.map((cls, idx) => (
                          <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                            <strong>{cls.name}</strong>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              Satır: {cls.line_start} - {cls.line_end}
                              {cls.methods && ` | Metodlar: ${cls.methods.join(', ')}`}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )
                  },
                  {
                    key: 'imports',
                    label: `Import'lar (${selectedFile.imports?.length || 0})`,
                    children: (
                      <div>
                        {selectedFile.imports?.map((imp, idx) => (
                          <Tag key={idx} style={{ marginBottom: 8 }}>{imp}</Tag>
                        ))}
                      </div>
                    )
                  },
                  {
                    key: 'ai',
                    label: 'AI Analizi',
                    children: (
                      <div>
                        {selectedFile.ai_analysis ? (
                          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(selectedFile.ai_analysis, null, 2)}
                          </pre>
                        ) : (
                          <p>AI analizi mevcut değil</p>
                        )}
                      </div>
                    )
                  }
                ]}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                Detayları görmek için soldaki dosya ağacından bir dosya seçin
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CodeMap;
