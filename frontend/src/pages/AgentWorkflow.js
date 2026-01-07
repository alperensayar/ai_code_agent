import React, { useState, useEffect } from 'react';
import { Card, Steps, Spin, Tag, Descriptions, Timeline } from 'antd';
import { useParams } from 'react-router-dom';
import {
  RobotOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { requirementService, agentService } from '../services/api';

const AgentWorkflow = () => {
  const { requirementId } = useParams();
  const [requirement, setRequirement] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 3000);
    return () => clearInterval(interval);
  }, [requirementId]);

  const loadData = async () => {
    try {
      const [reqRes, tasksRes] = await Promise.all([
        requirementService.getById(requirementId),
        agentService.getTasks(requirementId)
      ]);
      
      setRequirement(reqRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    const map = {
      pending: <SyncOutlined spin style={{ color: '#1890ff' }} />,
      processing: <SyncOutlined spin style={{ color: '#faad14' }} />,
      completed: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      failed: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    };
    return map[status] || <RobotOutlined />;
  };

  const getStatusTag = (status) => {
    const map = {
      pending: { color: 'blue', text: 'Beklemede' },
      processing: { color: 'orange', text: 'İşleniyor' },
      completed: { color: 'green', text: 'Tamamlandı' },
      failed: { color: 'red', text: 'Başarısız' }
    };
    const s = map[status] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  const getAgentName = (type) => {
    const map = {
      frontend: 'Frontend Agent',
      backend: 'Backend Agent',
      database: 'Database Agent',
      orchestrator: 'Orchestrator Agent'
    };
    return map[type] || type;
  };

  if (loading && !requirement) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" tip="Yükleniyor..." />
      </div>
    );
  }

  return (
    <div data-testid="agent-workflow-page">
      <h1 style={{ marginBottom: 24 }}>Multi-Agent İşleme Süreci</h1>

      {requirement && (
        <Card title="İstek Bilgisi" style={{ marginBottom: 24 }}>
          <Descriptions column={1}>
            <Descriptions.Item label="Durum">
              {getStatusTag(requirement.status)}
            </Descriptions.Item>
            <Descriptions.Item label="İstek">
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                {requirement.prompt}
              </div>
            </Descriptions.Item>
            {requirement.analysis && (
              <Descriptions.Item label="AI Analizi">
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                  {JSON.stringify(requirement.analysis, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
            {requirement.affected_components && (
              <Descriptions.Item label="Etkilenen Bileşenler">
                <div>
                  {requirement.affected_components.frontend?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>Frontend:</strong> {requirement.affected_components.frontend.join(', ')}
                    </div>
                  )}
                  {requirement.affected_components.backend?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>Backend:</strong> {requirement.affected_components.backend.join(', ')}
                    </div>
                  )}
                  {requirement.affected_components.database?.length > 0 && (
                    <div>
                      <strong>Database:</strong> {requirement.affected_components.database.join(', ')}
                    </div>
                  )}
                </div>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      <Card title="Agent Görevleri">
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <Spin /> Agent görevleri oluşturuluyor...
          </div>
        ) : (
          <Timeline>
            {tasks.map((task) => (
              <Timeline.Item
                key={task.id}
                dot={getStatusIcon(task.status)}
              >
                <Card
                  size="small"
                  className={`agent-card ${task.status}`}
                  style={{ marginBottom: 16 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <strong>
                      <RobotOutlined /> {getAgentName(task.agent_type)}
                    </strong>
                    {getStatusTag(task.status)}
                  </div>
                  
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Giriş Verisi">
                      <pre style={{ fontSize: '11px', maxHeight: 100, overflowY: 'auto' }}>
                        {JSON.stringify(task.input_data, null, 2)}
                      </pre>
                    </Descriptions.Item>
                    
                    {task.output_data && (
                      <Descriptions.Item label="Çıkış Verisi">
                        <pre style={{ fontSize: '11px', maxHeight: 100, overflowY: 'auto' }}>
                          {JSON.stringify(task.output_data, null, 2)}
                        </pre>
                      </Descriptions.Item>
                    )}
                    
                    {task.completed_at && (
                      <Descriptions.Item label="Tamamlanma">
                        {new Date(task.completed_at).toLocaleString('tr-TR')}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>
    </div>
  );
};

export default AgentWorkflow;
