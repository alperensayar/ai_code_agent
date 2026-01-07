import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Spin, Timeline, Tag, Alert } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { SendOutlined, RobotOutlined } from '@ant-design/icons';
import { projectService, requirementService } from '../services/api';

const { TextArea } = Input;

const RequirementAnalysis = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [project, setProject] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectRes, requirementsRes] = await Promise.all([
        projectService.getById(projectId),
        requirementService.getByProject(projectId)
      ]);
      
      setProject(projectRes.data);
      setRequirements(requirementsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      const response = await requirementService.create({
        project_id: projectId,
        prompt: values.prompt
      });
      
      message.success('İstek analiz ediliyor!');
      form.resetFields();
      
      // Navigate to agent workflow
      setTimeout(() => {
        navigate(`/agents/${response.data.id}`);
      }, 2000);
    } catch (error) {
      console.error('Error creating requirement:', error);
      message.error('İstek oluşturulurken hata oluştu!');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const map = {
      pending: 'blue',
      analyzing: 'orange',
      completed: 'green',
      failed: 'red'
    };
    return map[status] || 'default';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" tip="Yükleniyor..." />
      </div>
    );
  }

  return (
    <div data-testid="requirement-analysis-page">
      <h1 style={{ marginBottom: 24 }}>{project?.name} - İstek Analizi</h1>

      <Alert
        message="İş İhtyacı Analizi"
        description="Yapmak istediğiniz değişikliği, yeni özelliği veya düzeltmeyi açıklayın. AI sistemimiz kod tabanınızı analiz ederek hangi ekranların, API'lerin ve veri modellerinin etkileneceğini tespit edecektir."
        type="info"
        style={{ marginBottom: 24 }}
        showIcon
      />

      <Card title="Yeni İstek Oluştur" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={submitting}
        >
          <Form.Item
            label="İstek Tanımı (Text Prompt)"
            name="prompt"
            rules={[
              { required: true, message: 'Lütfen istek tanımını girin!' },
              { min: 20, message: 'İstek tanımı en az 20 karakter olmalıdır!' }
            ]}
          >
            <TextArea
              rows={6}
              placeholder="Örnek: Kullanıcıların profil fotoğrafı yükleyebilmesi için yeni bir özellik eklemek istiyorum. Bu özellik kullanıcı profil sayfasında görünmeli ve fotoğraflar cloud storage'a kaydedilmeli."
              data-testid="requirement-prompt-input"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<SendOutlined />}
              loading={submitting}
              block
              data-testid="submit-requirement-btn"
            >
              {submitting ? 'Analiz Ediliyor...' : 'Analiz Başlat'}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {requirements.length > 0 && (
        <Card title="Önceki İstekler">
          <Timeline>
            {requirements.map((req) => (
              <Timeline.Item
                key={req.id}
                dot={<RobotOutlined />}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tag color={getStatusColor(req.status)}>
                      {req.status === 'pending' ? 'Beklemede' :
                       req.status === 'analyzing' ? 'Analiz Ediliyor' :
                       req.status === 'completed' ? 'Tamamlandı' : 'Başarısız'}
                    </Tag>
                    <span style={{ color: '#999', fontSize: '12px' }}>
                      {new Date(req.created_at).toLocaleString('tr-TR')}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                    {req.prompt}
                  </div>
                  {req.status === 'completed' && (
                    <div style={{ marginTop: 8 }}>
                      <Button
                        size="small"
                        onClick={() => navigate(`/agents/${req.id}`)}
                      >
                        Agent Süreci
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        style={{ marginLeft: 8 }}
                        onClick={() => navigate(`/recommendations/${req.id}`)}
                      >
                        Önerileri Gör
                      </Button>
                    </div>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      )}
    </div>
  );
};

export default RequirementAnalysis;
