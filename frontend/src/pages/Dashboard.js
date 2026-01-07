import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Tag, Button, Statistic, Space, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  ProjectOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { projectService } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    analyzing: 0,
    pending: 0
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectService.getAll();
      const projectsData = response.data;
      setProjects(projectsData);
      
      // Calculate stats
      const statsData = {
        total: projectsData.length,
        completed: projectsData.filter(p => p.status === 'completed').length,
        analyzing: projectsData.filter(p => p.status === 'analyzing').length,
        pending: projectsData.filter(p => p.status === 'pending').length
      };
      setStats(statsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'blue', text: 'Beklemede' },
      analyzing: { color: 'orange', text: 'Analiz Ediliyor' },
      completed: { color: 'green', text: 'Tamamlandı' },
      failed: { color: 'red', text: 'Başarısız' }
    };
    const s = statusMap[status] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  const columns = [
    {
      title: 'Proje Adı',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => navigate(`/code-map/${record.id}`)}>{text}</a>
      )
    },
    {
      title: 'GitHub URL',
      dataIndex: 'github_url',
      key: 'github_url',
      render: (url) => (
        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
      )
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Oluşturulma',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleString('tr-TR')
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => navigate(`/code-map/${record.id}`)}
            disabled={record.status !== 'completed'}
          >
            Kod Haritası
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => navigate(`/requirement/${record.id}`)}
            disabled={record.status !== 'completed'}
          >
            İstek Analizi
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div data-testid="dashboard-page">
      <h1 style={{ marginBottom: 24 }}>Dashboard</h1>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Toplam Proje"
              value={stats.total}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tamamlanan"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Analiz Ediliyor"
              value={stats.analyzing}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Beklemede"
              value={stats.pending}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Projeler"
        extra={
          <Button
            type="primary"
            onClick={() => navigate('/analysis')}
            data-testid="new-analysis-btn"
          >
            Yeni Analiz
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            dataSource={projects}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
