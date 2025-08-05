import { useFirestore } from '../../context/FirestoreContext';

function UserSidebar({ onClose }) {
  const {
    topics,
    questions,
    selectedTopicId,
    setSelectedTopicId,
    selectedQuestion,
    nextQuestion,
    handleSelectQuestion,
    updateUserData,
    goal,
    loading,
    topicProgress,
    removeQuestionStatus,
  } = useFirestore();


  const handleTopicChange = (e) => {
    const newTopicId = e.target.value;
    setSelectedTopicId(newTopicId);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleQuestionClick = (q) => {
    const status = topicProgress?.[q.id]?.status;
    const isSelectableStatus = ['Completed', 'Review Later'].includes(status);
    const isSameAsSelected = selectedQuestion?.id === q.id;
    const isNext = nextQuestion?.id === q.id;
    const isSelectable = isSelectableStatus || isSameAsSelected || isNext;

    if (isSelectable) {
      if (!isSameAsSelected) {
        handleSelectQuestion(q);
      }

      if (window.innerWidth < 768) {
        onClose();
      }
    }
  };

  const queue = questions;
  const mode = goal === 'learn' ? 'Learning' : 'Practice';

  const toggleMode = () => {
    const newMode = goal === 'learn' ? 'practice' : 'learn';
    updateUserData({ goal: newMode });
  };

  // Show loading placeholder while Firestore is loading
  if (loading) {
    return (
      <div className="d-flex flex-column bg-light vh-100 p-3" style={{ position: 'sticky', top: 0 }}>
        <h5 className="text-muted">Loading...</h5>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column bg-light vh-100 p-3" style={{ position: 'sticky', top: 0 }}>
      <div className="d-md-none d-flex justify-content-end mb-4">
        <button
          onClick={onClose}
          type="button"
          class="btn btn-light border d-flex align-items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
          >
            <polyline
              points="12 4 6 10 12 16"
              fill="none"
              stroke="black"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Back</span>
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-5">
        <h4 className='mb-0'>{mode}</h4>
        <button
          onClick={toggleMode}
          className="btn rounded-circle p-0 d-flex align-items-center justify-content-center"
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: goal === 'learn' ? '#28a745' : '#007bff',
            color: '#fff',
            border: 'none',
            transition: 'background-color 0.3s ease',
          }}
          title={`Switch to ${goal === 'learn' ? 'Practice' : 'Learning'} mode`}
        >
          {goal === 'learn' ? 'L' : 'P'}
        </button>
      </div>

      <div className="d-flex align-items-center mb-3">
        <select
          className="form-select border"
          value={selectedTopicId || ''}
          onChange={handleTopicChange}
        >
          <option value="">Select</option>
          {topics.map(topic => (
            <option key={topic.id} value={topic.id}>
              {topic.name || topic.id}
            </option>
          ))}
        </select>
      </div>

      <div
        className="flex-grow-1 overflow-auto position-relative"
        style={{
          overflowY: 'scroll',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >

        <ul className="list-group" style={{ position: 'relative', padding: '1rem 0' }}>
          {queue.map((question, index) => {
            const isMiddle = index === Math.floor(queue.length / 2);
            const status = topicProgress?.[question.id]?.status;

            const isCompleted = status === 'Completed';
            const isReviewLater = status === 'Review Later';
            const isMuted = isCompleted || isReviewLater;

            let backgroundColor = '';
            if (isCompleted) backgroundColor = '#f4fdf7'; // Softer pastel green
            else if (isReviewLater) backgroundColor = '#fffdf5'; // Softer pastel yellow

            return (
              <li
                key={question.id}
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onClick={() => handleQuestionClick(question)}
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, background-color 0.2s ease',
                  zIndex: isMiddle ? 1 : 0,
                  backgroundColor,
                }}
              >
                <span
                  className={isMuted ? 'text-dark' : 'text-primary'}
                  style={{ opacity: isMuted ? 0.6 : 1 }}
                >
                  {question.title}
                </span>

                {/* Show only if status is set */}
                {(isCompleted || isReviewLater) && (
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => removeQuestionStatus(selectedTopicId, question.id)}
                    title={isCompleted ? 'Completed' : 'Review Later'}
                    style={{
                      width: '20px',
                      height: '20px',
                      accentColor: isCompleted ? '#28a745' : '#ffc107',
                      cursor: 'pointer',
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default UserSidebar;
