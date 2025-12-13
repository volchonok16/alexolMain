import { useState } from "react";
import { Modal, Select } from "@/shared/ui";
import "./ProjectModal.scss";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectModal = ({ isOpen, onClose }: ProjectModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    budget: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Обсудить проект">
      <form onSubmit={handleSubmit} className="project-modal__form">
        <div className="project-modal__field">
          <label className="project-modal__label">Ваше имя *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="project-modal__input"
            placeholder="Иван Иванов"
          />
        </div>

        <div className="project-modal__field">
          <label className="project-modal__label">Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="project-modal__input"
            placeholder="email@example.com"
          />
        </div>

        <div className="project-modal__field">
          <label className="project-modal__label">Телефон</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="project-modal__input"
            placeholder="+7 (999) 123-45-67"
          />
        </div>

        <div className="project-modal__field">
          <label className="project-modal__label">Бюджет проекта</label>
          <Select
            options={[
              { value: "500k-1m", label: "500 тыс. - 1 млн ₽" },
              { value: "1m-3m", label: "1 - 3 млн ₽" },
              { value: "3m-5m", label: "3 - 5 млн ₽" },
              { value: "5m+", label: "От 5 млн ₽" },
            ]}
            value={formData.budget}
            onChange={(value) => setFormData({ ...formData, budget: value })}
            placeholder="Выберите диапазон"
          />
        </div>

        <div className="project-modal__field">
          <label className="project-modal__label">Описание задачи *</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="project-modal__textarea"
            placeholder="Расскажите о вашем проекте..."
          />
        </div>

        <button type="submit" className="project-modal__submit">
          Отправить заявку
        </button>
      </form>
    </Modal>
  );
};
