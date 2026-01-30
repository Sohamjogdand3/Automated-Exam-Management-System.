import React, { lazy } from "react";
import { Navigate, Route, createBrowserRouter, createRoutesFromElements } from "react-router-dom";
import Loadable from "../layouts/full/shared/loadable/Loadable";

/* Layouts */
const BlankLayout = Loadable(lazy(() => import("../layouts/blank/BlankLayout")));
const FullLayout = Loadable(lazy(() => import("../layouts/full/FullLayout")));
const ExamLayout = Loadable(lazy(() => import("../layouts/full/ExamLayout")));

/* Pages */
const Login = Loadable(lazy(() => import("../views/authentication/Login")));
const Register = Loadable(lazy(() => import("../views/authentication/Register")));
const Error = Loadable(lazy(() => import("../views/authentication/Error")));
const UserAccount = Loadable(lazy(() => import("../views/authentication/UserAccount")));

const ExamPage = Loadable(lazy(() => import("../views/student/ExamPage")));
const ExamDetails = Loadable(lazy(() => import("../views/student/ExamDetails")));
const TestPage = Loadable(lazy(() => import("../views/student/TestPage")));
const CodeDetails = Loadable(lazy(() => import("../views/student/CodeDetails")));
const ResultPage = Loadable(lazy(() => import("../views/student/ResultPage")));
const Coder = Loadable(lazy(() => import("../views/student/Coder")));

const CreateExamPage = Loadable(lazy(() => import("../views/teacher/CreateExamPage")));
const AddQuestions = Loadable(lazy(() => import("../views/teacher/AddQuestions")));
const ExamLogPage = Loadable(lazy(() => import("../views/teacher/ExamLogPage")));

const Router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* AUTH ROUTES */}
      <Route path="/auth" element={<BlankLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="404" element={<Error />} />
      </Route>

      {/* MAIN APP ROUTES */}
      <Route path="/" element={<FullLayout />}>
        <Route index element={<Navigate to="/auth/login" />} />
        <Route path="dashboard" element={<ExamPage />} />
        <Route path="exam" element={<ExamPage />} />
        <Route path="result" element={<ResultPage />} />
        <Route path="user/account" element={<UserAccount />} />

        {/* Teacher */}
        <Route path="create-exam" element={<CreateExamPage />} />
        <Route path="add-questions" element={<AddQuestions />} />
        <Route path="add-questions/:examId" element={<AddQuestions />} />
        <Route path="exam-log" element={<ExamLogPage />} />
      </Route>

      {/* EXAM ROUTES */}
      <Route element={<ExamLayout />}>
        <Route path="exam/:examId" element={<ExamDetails />} />
        <Route path="exam/:examId/:testId" element={<TestPage />} />
        <Route path="exam/:examId/codedetails" element={<CodeDetails />} />
        <Route path="exam/:examId/code" element={<Coder />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/auth/login" />} />
    </>
  )
);

export default Router;
