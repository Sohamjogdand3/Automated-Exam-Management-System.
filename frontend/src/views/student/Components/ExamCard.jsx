import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import { CardActionArea, IconButton, Stack } from '@mui/material';
import DeleteIcon from '../../teacher/components/DeleteIcon';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import ExamKeyModal from './ExamKeyModal';

const imgUrl =
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c';

export default function ExamCard({ exam }) {
  const { examName, duration, totalQuestions, examId } = exam;
  const { userInfo } = useSelector((state) => state.auth);
  const isTeacher = userInfo?.role === 'teacher';

  const [openKeyModal, setOpenKeyModal] = React.useState(false);

  const handleCardClick = () => {
    if (isTeacher) {
      toast.error('You are a teacher, you cannot take this exam');
      return;
    }
    setOpenKeyModal(true); // 🔐 OPEN KEY MODAL
  };

  return (
    <>
      <Card>
        <CardActionArea onClick={handleCardClick}>
          <CardMedia component="img" height="140" image={imgUrl} />
          <CardContent>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h5">{examName}</Typography>
              {isTeacher && (
                <IconButton>
                  <DeleteIcon examId={examId} />
                </IconButton>
              )}
            </Stack>
            <Stack direction="row" justifyContent="space-between" mt={1}>
              <Typography>{totalQuestions} ques</Typography>
              <Typography>{duration} mins</Typography>
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>

      {/* 🔐 KEY MODAL */}
      <ExamKeyModal
        open={openKeyModal}
        onClose={() => setOpenKeyModal(false)}
        examId={examId}
      />
    </>
  );
}
