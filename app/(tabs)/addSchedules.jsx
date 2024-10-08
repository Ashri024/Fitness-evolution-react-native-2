import React, { useEffect, useState } from 'react';
import { View, SafeAreaView ,ScrollView, } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScheduleHeader from '../components/MySchedules/ScheduleHeader';
import MilestoneVisual from '../components/AddSchedules/MilestoneVisual';
import DateTime from '../components/AddSchedules/DateTime';
import ScheduleDetails from '../components/AddSchedules/ScheduleDetails';
import { useFormContext } from '../../contexts/FormProivder';
import Confirm from '../components/AddSchedules/Confirm';
import { useScheduleContext } from '../../contexts/ScheduleProvider';
import { modifySchedule, postSchedule } from '../../lib/Users/Schedule';
import { useGlobalContext } from '../../contexts/GlobalProvider';
import {Toast} from 'toastify-react-native';
import { router } from 'expo-router';
const validationSchema = Yup.object().shape({
  milestone1: Yup.string().required('Milestone 1 is required'),
  milestone2: Yup.string().required('Milestone 2 is required'),
  milestone3: Yup.string().required('Milestone 3 is required'),
});

const AddSchedule = () => {
  const insets = useSafeAreaInsets();
  const {selectedDate, startTime,  endTime,subject, description, userName,link,userId,submitStatus,setPostLoading,scheduleApprovedId,getIsoDateTimeString,resetFormValues,step, setStep,setSelectedUser,setTabsChanged} = useFormContext();
  const {token,user,setIntialRoute,setChats,sendMsgFromTrainer} = useGlobalContext();
  const {appendUpcoming,setRequested,appendPending} = useScheduleContext();
  const handleNext = (values) => {
    if (step < 3) {
      setStep(step + 1);
      if(step==1){

      }else if(step==2){
      }
    } 
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  const handleSubmit = async() => {
  const trainerId = user?.role === 'admin' ? user?._id : user.trainerAssigned?._id;
  let startTimeFormatted,endTimeFormatted;
  if(selectedDate && startTime && endTime){
    startTimeFormatted = getIsoDateTimeString(selectedDate,startTime);
    if(endTime === '00:00'){
      // extend plus one date then convert to isostring
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      endTimeFormatted = getIsoDateTimeString(nextDay,endTime);
    }else{
     endTimeFormatted = getIsoDateTimeString(selectedDate,endTime);
  }
  }
  
  const data = {
    date: selectedDate,
    startTime: startTimeFormatted,
    endTime: endTimeFormatted,
    scheduleLink: link,
    scheduleSubject: subject,
    scheduleDescription: description,
    userId: userId,
    trainerId: trainerId,
  }
  
    if(submitStatus==='createNew'){
      setPostLoading(true);
      try{
      const response = await postSchedule(token,data);
      if(user?.role === 'admin'){
        appendUpcoming(response);
      }
      if(user?.role === 'user'){
        appendPending(response);
      }
        setStep(1);
        resetFormValues();
        if(user?.role === 'admin'){
          Toast.success('Schedule created successfully','top')
          setIntialRoute("Upcoming")
          setTabsChanged(true);
          router.push("/mySchedules");
          sendMsgFromTrainer(`Yo ${userName} ! I have scheduled a class named "${subject}" with you. Please check the schedule in your upcomings.`,userName,userId);
        }else{
          Toast.success('Schedule requested successfully','top')
          setIntialRoute("Pending")
          setTabsChanged(true);
          router.push("/mySchedules");
          sendMsgFromTrainer(`Yo ${userName} ! Thanks for scheduling a class "${subject}" with me. I am looking forward to it. I will approve the schedule soon :)`,userName,userId);
        }
      }catch (err){
        const errorMessage = err.response?.data?.message || 'Error creating schedule';
        Toast.error(errorMessage,'top')
        console.error('Error creating schedule:',err);
      }finally{
        setPostLoading(false);
      }
    }
    else if(submitStatus==='toReschedule' || submitStatus==='toApprove'){
      if(!scheduleApprovedId){
        Toast.error('Schedule approve id not found','top')
        return;
      }
      setPostLoading(true);
      try{
        const response = await modifySchedule(token,scheduleApprovedId,data);
        if(response){
          appendUpcoming(response);
          setIntialRoute("Upcoming")
          setTabsChanged(true);
          setStep(1);
          resetFormValues();
        if(submitStatus==='toReschedule'){
          Toast.success('Schedule rescheduled successfully','top')
          sendMsgFromTrainer(`Hey ${userName}, I have rescheduled the class "${subject}". Please check the new schedule in your upcomings.`,userName,userId);
        }else{
          Toast.success('Schedule approved successfully','top')
          sendMsgFromTrainer(`Hey ${userName}, I have approved the schedule "${subject}". Please check the schedule in your upcomings.`,userName,userId);
          setRequested((prev)=>{
            let newRequested = prev.filter((item)=>item._id!==scheduleApprovedId);
            return newRequested;
          })
        }
        router.push("/mySchedules");
      }
      }catch (err){
        const errorMessage = err.response?.data?.message || 'Error modifying schedule';
        Toast.error(errorMessage,'top')
        console.error('Error modifying schedule:',err);
      }finally{
        setPostLoading(false);
      }
    }
    setSelectedUser(null);
  }
  const changeMilestone = (step) => {
    return `Milestone ${step}`;
  }

  return (
    <SafeAreaView className="bg-primary h-full" style={{ paddingTop: insets.top }}>
      <ScheduleHeader title={"Create A Schedule"} onPress={resetFormValues} />
      <ScrollView>
      <Formik
        initialValues={{
          milestone1: { date: '', startTime: '', endTime: '' },
         milestone2: '',
         milestone3: '' }}
        validationSchema={validationSchema}
        onSubmit={handleNext}
      >
        {({ handleChange, handleBlur, handleSubmit2, values, errors, touched }) => (
          <View className="p-4">

          <MilestoneVisual step={step} />
            {step === 1 && (
              <DateTime values={values} errors={errors} handleNext={handleNext} />
            )}
            {step === 2 && (
              <ScheduleDetails values={values} touched={touched} errors={errors} handleNext={handleNext} handleBack={handleBack} />
            )}
            {step === 3 && (
             <Confirm values={values} handleBack={handleBack} handleSubmit={handleSubmit} />
            )}
          </View>
        )}
      </Formik>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddSchedule;