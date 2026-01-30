import { apiSlice } from './apiSlice';

const EXAMS_URL = '/api/exam';

export const examApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getExams: builder.query({
      query: () => ({
        url: EXAMS_URL,
        method: 'GET',
      }),
    }),

    createExam: builder.mutation({
      query: (data) => ({
        url: EXAMS_URL,
        method: 'POST',
        body: data,
      }),
    }),

    getQuestions: builder.query({
      query: (examId) => ({
        url: `${EXAMS_URL}/questions/${examId}`,
        method: 'GET',
      }),
    }),

    createQuestion: builder.mutation({
      query: (data) => ({
        url: `${EXAMS_URL}/questions`,
        method: 'POST',
        body: data,
      }),
    }),

    deleteExam: builder.mutation({
      query: (examId) => ({
        url: `${EXAMS_URL}/${examId}`,
        method: 'DELETE',
      }),
    }),

    // 🔐 VALIDATE EXAM KEY
    validateExamKey: builder.mutation({
      query: (data) => ({
        url: `${EXAMS_URL}/validate-key`,
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useGetExamsQuery,
  useCreateExamMutation,
  useGetQuestionsQuery,
  useCreateQuestionMutation,
  useDeleteExamMutation,
  useValidateExamKeyMutation,
} = examApiSlice;
