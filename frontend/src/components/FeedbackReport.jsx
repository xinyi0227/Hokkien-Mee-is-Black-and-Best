// FeedbackReport.jsx
import React, { useState } from 'react';

const EditReportModal = ({ report, onClose, onSave, isNewReport = false }) => {
  const [editedData, setEditedData] = useState(report.file_content || {});
  
  const handleChange = (path, value) => {
    const keys = path.split('.');
    const newData = { ...editedData };
    let current = newData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setEditedData(newData);
  };
  
  const handleSubmit = () => {
    onSave(report.id, editedData);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">
            {isNewReport ? 'Review New Report: ' : 'Edit Report: '}{report.filename}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {isNewReport && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-blue-700">
                <strong>New Report Generated!</strong> Please review and save this report to finalize it.
                The PDF download button will appear after you save.
              </p>
            </div>
          )}
          
          {/* Sentiment Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Sentiment Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Positive %</label>
                <input
                  type="number"
                  value={editedData.feedback_analysis?.sentiment_summary?.positive_percentage || 0}
                  onChange={(e) => handleChange('feedback_analysis.sentiment_summary.positive_percentage', parseFloat(e.target.value))}
                  className="w-full p-2 border rounded"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Negative %</label>
                <input
                  type="number"
                  value={editedData.feedback_analysis?.sentiment_summary?.negative_percentage || 0}
                  onChange={(e) => handleChange('feedback_analysis.sentiment_summary.negative_percentage', parseFloat(e.target.value))}
                  className="w-full p-2 border rounded"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Neutral %</label>
                <input
                  type="number"
                  value={editedData.feedback_analysis?.sentiment_summary?.neutral_percentage || 0}
                  onChange={(e) => handleChange('feedback_analysis.sentiment_summary.neutral_percentage', parseFloat(e.target.value))}
                  className="w-full p-2 border rounded"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>
          </div>
          
          {/* Positive Feedback Categories */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Positive Feedback Categories</h3>
            {editedData.feedback_analysis?.positive_feedback_analysis?.categories?.map((category, index) => (
              <div key={index} className="mb-4 p-4 bg-green-50 dark:bg-green-900 rounded">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                    <input
                      type="text"
                      value={category.category || ''}
                      onChange={(e) => handleChange(`feedback_analysis.positive_feedback_analysis.categories.${index}.category`, e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percentage</label>
                    <input
                      type="number"
                      value={category.percentage || 0}
                      onChange={(e) => handleChange(`feedback_analysis.positive_feedback_analysis.categories.${index}.percentage`, parseFloat(e.target.value))}
                      className="w-full p-2 border rounded"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Examples</label>
                  {category.examples?.map((example, exIndex) => (
                    <input
                      key={exIndex}
                      type="text"
                      value={example}
                      onChange={(e) => handleChange(`feedback_analysis.positive_feedback_analysis.categories.${index}.examples.${exIndex}`, e.target.value)}
                      className="w-full p-2 border rounded mb-2"
                    />
                  ))}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Themes</label>
                  {category.key_themes?.map((theme, themeIndex) => (
                    <input
                      key={themeIndex}
                      type="text"
                      value={theme}
                      onChange={(e) => handleChange(`feedback_analysis.positive_feedback_analysis.categories.${index}.key_themes.${themeIndex}`, e.target.value)}
                      className="w-full p-2 border rounded mb-2"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Negative Feedback Categories */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Negative Feedback Categories</h3>
            {editedData.feedback_analysis?.negative_feedback_analysis?.categories?.map((category, index) => (
              <div key={index} className="mb-4 p-4 bg-red-50 dark:bg-red-900 rounded">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                    <input
                      type="text"
                      value={category.category || ''}
                      onChange={(e) => handleChange(`feedback_analysis.negative_feedback_analysis.categories.${index}.category`, e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percentage</label>
                    <input
                      type="number"
                      value={category.percentage || 0}
                      onChange={(e) => handleChange(`feedback_analysis.negative_feedback_analysis.categories.${index}.percentage`, parseFloat(e.target.value))}
                      className="w-full p-2 border rounded"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Examples</label>
                  {category.examples?.map((example, exIndex) => (
                    <input
                      key={exIndex}
                      type="text"
                      value={example}
                      onChange={(e) => handleChange(`feedback_analysis.negative_feedback_analysis.categories.${index}.examples.${exIndex}`, e.target.value)}
                      className="w-full p-2 border rounded mb-2"
                    />
                  ))}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Issues</label>
                  {category.key_issues?.map((issue, issueIndex) => (
                    <input
                      key={issueIndex}
                      type="text"
                      value={issue}
                      onChange={(e) => handleChange(`feedback_analysis.negative_feedback_analysis.categories.${index}.key_issues.${issueIndex}`, e.target.value)}
                      className="w-full p-2 border rounded mb-2"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Recommendations */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Recommendations</h3>
            {editedData.feedback_analysis?.recommendations?.map((rec, index) => (
              <div key={index} className="mb-4 p-4 bg-blue-50 dark:bg-blue-900 rounded">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                    <input
                      type="text"
                      value={rec.area || ''}
                      onChange={(e) => handleChange(`feedback_analysis.recommendations.${index}.area`, e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={rec.priority || 'medium'}
                      onChange={(e) => handleChange(`feedback_analysis.recommendations.${index}.priority`, e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <textarea
                    value={rec.action || ''}
                    onChange={(e) => handleChange(`feedback_analysis.recommendations.${index}.action`, e.target.value)}
                    className="w-full p-2 border rounded"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
                    <input
                      type="text"
                      value={rec.impact || ''}
                      onChange={(e) => handleChange(`feedback_analysis.recommendations.${index}.impact`, e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                    <select
                      value={rec.timeline || 'short-term'}
                      onChange={(e) => handleChange(`feedback_analysis.recommendations.${index}.timeline`, e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="short-term">Short-term</option>
                      <option value="medium-term">Medium-term</option>
                      <option value="long-term">Long-term</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="mr-3 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className=" px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-[#aad576] dark:hover:bg-[#c1fba4] dark:text-black"
          >
            {isNewReport ? 'Save & Finalize Report' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditReportModal;