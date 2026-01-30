import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import { toast } from 'react-toastify';
import { useValidateExamKeyMutation } from 'src/slices/examApiSlice';
import { useNavigate } from 'react-router-dom';

export default function ExamKeyModal({ open, onClose, examId }) {
  const [examKey, setExamKey] = useState('');
  const [validateExamKey, { isLoading }] = useValidateExamKeyMutation();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (examKey.length !== 6) {
      toast.error('Exam key must be 6 digits');
      return;
    }

    try {
      await validateExamKey({ examId, examKey }).unwrap();

      // ✅ Mark key as verified
      sessionStorage.setItem(`examKeyVerified-${examId}`, 'true');

      toast.success('Exam key verified');
      onClose();

      // Navigate to exam details page
      navigate(`/exam/${examId}`);
    } catch (err) {
      toast.error(err?.data?.message || 'Invalid exam key');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Enter Exam Key</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Exam Key"
            value={examKey}
            onChange={(e) => {
              if (e.target.value.length <= 6) {
                setExamKey(e.target.value.replace(/\D/g, ''));
              }
            }}
            inputProps={{ maxLength: 6 }}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify & Continue'}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
