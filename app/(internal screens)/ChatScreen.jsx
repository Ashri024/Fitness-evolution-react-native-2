import { View, TextInput, SafeAreaView, ScrollView, Text, Pressable, ActivityIndicator } from 'react-native';
import React, { useEffect, useRef, useState} from 'react';
import ScheduleHeader from '../components/MySchedules/ScheduleHeader';
import { router, useGlobalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalContext } from '../../contexts/GlobalProvider';
import MessageInstance from '../components/Chat/MessageInstance';
import { Toast } from 'toastify-react-native';

const ChatScreen = () => {
  const { receiver, userName} = useGlobalSearchParams();
  let objReceiver = JSON.parse(receiver);
  const insets = useSafeAreaInsets();

  const [msg, setMsg] = useState("");
  const { chats, setChats ,user,socket,setLastMessages,setReceived,scrollRef} = useGlobalContext();
  const userId1 = user?._id;
  const userId2 = objReceiver?.id;
  const [isSending, setIsSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
useEffect(()=>{
  if (scrollRef.current) {
    scrollRef.current.scrollToEnd({ animated: true});
  }
  if(loadingMessages){
    setLoadingMessages(false);
  }
},[chats])
useEffect(()=>{
  setReceived((prevReceived) => {
    let newReceived = prevReceived.filter((m) => m.senderId !== objReceiver.id);
    return newReceived;
  });
},[])
  useEffect(() => {
    if (!socket) return;
    socket.emit('loadMessages', { userId1, userId2 });

    socket.on('messages', (fetchedMessages) => {
      setChats(fetchedMessages);
    });

    socket.on('chat message', (msg) => {
      if (objReceiver.id === msg.senderId || user._id === msg.senderId) {
        setChats((prevChats) => [...prevChats, msg]);
        setLastMessages((prevMessages) => {
          let newMessages = prevMessages.filter((m) => m.senderId !== userId2 && m.receiverId !== userId2);
          newMessages.push(msg);
          return newMessages;
        });
        if (scrollRef.current) {
          scrollRef.current.scrollToEnd({ animated: true });
        }
      }
      if (socket?.connected) {
        socket.emit('message sent', msg._id);
      } else {
        console.log("Socket is not connected. Message delivered event not emitted.");
        Toast.error('Message delivered event not emitted.','top')
      }
    });

    socket.on('message status', (msg) => {
      setChats((prevChats) => {
        let newArr = prevChats.map((m) => (m._id === msg._id ? msg : m));
        return newArr;
      });
    });
    return () => {
      socket.off('messages');
      socket.off('chat message');
      socket.off('message status');
    };
  }, [objReceiver?._id, socket, user._id, userId1, userId2]);
useEffect(()=>{
  if(isSending){
    setIsSending(false);
  }
},[chats])
  const sendMessage = () => {
    setIsSending(true);
    const newMsg = {
      senderName: user.fullName,
      receiverName: objReceiver.userName,
      message: msg,
      senderId: userId1,
      receiverId: userId2,
      status: 'pending'
    };
    socket?.emit('chat message', newMsg);
    setMsg(""); 
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }

  const handleRead = (msg) => {
    if (msg.status !== 'read') {
      socket?.emit('message read', msg._id);
    }
  };

  if(loadingMessages){
    return (
      <SafeAreaView className="bg-primary h-full" style={{ paddingTop: insets.top }}>
        <ScheduleHeader title={userName} onPress={()=>{
          setChats([])
          router.back();
          }}/>
        <ActivityIndicator size="large" color="#00C7BE" style={{
          marginTop: '50%'
        }} />
        <Text className="text-white_60 font-inter_Regular text-base w-1/2 mx-auto text-center mt-2">
          Loading messages...
        </Text>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className="bg-primary h-full" style={{ paddingTop: insets.top }}>
      <ScheduleHeader title={userName} />
      <ScrollView className="flex flex-col px-2" ref={scrollRef}>
        <Text className="text-white_60 font-inter_Regular text-sm w-1/2 mx-auto text-center">
          Our chats are end-to-end encrypted
        </Text>
        <View className="flex flex-col mt-4">
          {chats.map((chat, index) => (
            <MessageInstance key={index} msg={chat} user={user} onRead={handleRead} />
          ))}
        </View>
      </ScrollView>
      <View className="flex flex-row items-center gap-x-0 py-4 px-2 mb-2 relative">
        <TextInput
          className="w-[87%] h-12 bg-white_87 rounded-lg text-black px-4"
          placeholder="Type a message"
          value={msg}
          onChangeText={(text) => setMsg(text)}
        />
        <Pressable onPress={sendMessage} className="py-3 px-2 pl-3">
          {isSending ? <ActivityIndicator size="small" color="#00C7BE" />:
          <Ionicons name="send" size={26} color="#00C7BE" />
        }
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;