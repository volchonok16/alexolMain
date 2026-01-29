import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.scss';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="pagination">
      <button
        className="pagination__button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious}
        aria-label="Предыдущая страница"
      >
        <ChevronLeft />
      </button>
      
      <span className="pagination__info">
        Страница {currentPage} из {totalPages}
      </span>
      
      <button
        className="pagination__button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        aria-label="Следующая страница"
      >
        <ChevronRight />
      </button>
    </div>
  );
};
