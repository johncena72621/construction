import React from 'react';
import { View, Text } from 'react-native';
export default function AI({ navigation }: any) { React.useEffect(() => { navigation.goBack(); }, []); return <View><Text>Redirecting...</Text></View>; }
