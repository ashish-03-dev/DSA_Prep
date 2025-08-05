import { useState, useEffect } from 'react';
import { useFirestore } from '../../context/FirestoreContext';

function UserQuestionSolver() {
  const { loading, selectedQuestion, selectingQuestionLoading, setSelectedQuestion, updateUserQuestion } = useFirestore();
  const [codes, setCodes] = useState(['']);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('notes');

  useEffect(() => {
    if (selectedQuestion) {
      setNotes(selectedQuestion.notes || '');
      setCodes(selectedQuestion.codes?.length ? selectedQuestion.codes : ['']);
    }
  }, [selectedQuestion]);


  const handleStatusUpdate = async (status) => {
    if (!selectedQuestion) return;

    try {
      const updatedData = {
        status,
        codes,
        notes
      };

      await updateUserQuestion(selectedQuestion.topicId, selectedQuestion.id, updatedData);

      setSelectedQuestion(prev => ({
        ...prev,
        ...updatedData
      }));

    } catch (error) {
      console.error(`Error marking question as ${status}:`, error);
    }
  };

  const handleCodeChange = (index, value) => {
    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);
  };

  const addCodeInput = () => {
    setCodes([...codes, '']);
  };

  const removeCodeInput = (index) => {
    if (codes.length > 1) {
      setCodes(codes.filter((_, i) => i !== index));
    }
  };

  if (loading || selectingQuestionLoading) {
    return (
      <>
      </>
    );
  }

  if (!selectedQuestion) {
    return (
      <div
        className="d-flex flex-column justify-content-center align-items-center text-center"
        style={{ minHeight: '100svh' }}
      >
        <p className="text-danger">
          Unable to load question. Please try again later or check your network/limits.
        </p>
      </div>
    );
  }

  const isLeetCode = selectedQuestion.link?.includes('leetcode.com');
  const isGeeksForGeeks = selectedQuestion.link?.includes('geeksforgeeks.org');

  return (
    <div>
      <h2 className="mb-4">{selectedQuestion.title}</h2>
      <div className="mb-3">
        {selectedQuestion.link && (
          <div className="mb-3">
            {isLeetCode ? (
              <a
                href={selectedQuestion.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary me-2"
              >
                View on LeetCode
              </a>
            ) : isGeeksForGeeks ? (
              <a
                href={selectedQuestion.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success me-2"
              >
                View on GeeksforGeeks
              </a>
            ) : (
              <a
                href={selectedQuestion.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-secondary"
              >
                View Link
              </a>
            )}
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="d-flex gap-2 mb-3">
          <span
            className={`p-2 cursor-pointer ${activeTab === 'notes' ? 'text-primary' : 'text-secondary'}`}
            onClick={() => setActiveTab('notes')}
            style={{ cursor: 'pointer', borderBottom: activeTab === 'notes' ? '2px solid #0d6efd' : 'none' }}
          >
            Notes
          </span>
          <span
            className={`p-2 cursor-pointer ${activeTab === 'code' ? 'text-primary' : 'text-secondary'}`}
            onClick={() => setActiveTab('code')}
            style={{ cursor: 'pointer', borderBottom: activeTab === 'code' ? '2px solid #0d6efd' : 'none' }}
          >
            Solution
          </span>
        </div>
        <div className="d-flex gap-3" style={{ display: 'flex', flexWrap: 'wrap' }}>
          {activeTab === 'notes' && (
            <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
              <textarea
                className="form-control"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="10"
                placeholder="Add your notes here..."
                style={{ background: '#fffef2', border: '1px solid #ddd', width: '100%' }}
              />
            </div>
          )}
          {activeTab === 'code' && (
            <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
              {codes.map((code, index) => (
                <div key={index} className="mb-3">
                  <textarea
                    className="form-control"
                    value={code}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    rows="10"
                    placeholder={`Write your solution ${index + 1} here...`}
                    style={{ background: '#fffef2', border: '1px solid #ddd', width: '100%' }}
                  />
                  <div className="d-flex gap-2 mt-3">
                    {codes.length > 1 && (
                      <span
                        className="text-secondary cursor-pointer"
                        onClick={() => removeCodeInput(index)}
                        style={{ cursor: 'pointer' }}
                      >
                        Remove
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <span
                className="text-secondary cursor-pointer"
                onClick={addCodeInput}
                style={{ cursor: 'pointer' }}
              >
                Add another code
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-3">
        <span
          className="text-success cursor-pointer me-3"
          onClick={() => handleStatusUpdate('Completed')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          Mark as Completed
        </span>
        <span
          className="text-warning cursor-pointer"
          onClick={() => handleStatusUpdate('Review Later')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          Mark for Review Later
        </span>
      </div>
    </div>
  );
}

export default UserQuestionSolver;