import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Alert, Spin } from 'antd';
import { GithubOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/api';

const CodeAnalysis = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const response = await projectService.create(values);
      message.success('Proje oluşturuldu! Analiz başlatılıyor...');
      
      // Navigate to code map after a short delay
      setTimeout(() => {
        navigate(`/code-map/${response.data.id}`);
      }, 2000);
    } catch (error) {
      console.error('Error creating project:', error);
      message.error('Proje oluşturulurken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="code-analysis-page">
      <h1 style={{ marginBottom: 24 }}>Kod Analizi</h1>

      <Card style={{ maxWidth: 800, margin: '0 auto' }}>
        <Alert
          message="GitHub Repository Analizi"
          description="GitHub URL'nizi girerek kod tabanınızın kapsamlı analizini başlatın. AST parsing ve AI tabanlı analiz ile dosyalarınız, fonksiyonlarınız, sınıflarınız ve bağımlılıklarınız otomatik olarak haritalanacaktır."
          type="info"
          icon={<GithubOutlined />}
          style={{ marginBottom: 24 }}
          showIcon
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={loading}
        >
          <Form.Item
            label="Proje Adı"
            name="name"
            rules={[
              { required: true, message: 'Lütfen proje adı girin!' },
              { min: 3, message: 'Proje adı en az 3 karakter olmalıdır!' }
            ]}
          >
            <Input
              placeholder="Örn: E-Ticaret Platformu"
              size="large"
              data-testid="project-name-input"
            />
          </Form.Item>

          <Form.Item
            label="GitHub URL"
            name="github_url"
            rules={[
              { required: true, message: 'Lütfen GitHub URL girin!' },
              { 
                pattern: /^https?:\/\/(www\.)?github\.com\/.+\/.+/, 
                message: 'Geçerli bir GitHub URL girin!' 
              }
            ]}
          >
            <Input
              placeholder="https://github.com/username/repository"
              size="large"
              prefix={<GithubOutlined />}
              data-testid="github-url-input"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<RocketOutlined />}
              loading={loading}
              block
              data-testid="start-analysis-btn"
            >
              {loading ? 'Analiz Başlatılıyor...' : 'Analizi Başlat'}
            </Button>
          </Form.Item>
        </Form>

        {loading && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Spin size="large" tip="Repository klonlanıyor ve analiz ediliyor..." />
          </div>
        )}
      </Card>
    </div>
  );
};

export default CodeAnalysis;
