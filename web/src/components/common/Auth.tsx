import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Box, VStack, Image, CloseButton, HStack, Text, IconButton, Progress } from '@chakra-ui/react';
import { login } from '../../state/auth/reducer'
import { dispatch } from '../../state/dispatch'
import {auth, auth as authModule} from '../../app/api'
import { useSelector } from 'react-redux';
import logo from '../../assets/img/logo.svg'
import { BsLightbulbFill, BsArrowRight } from "react-icons/bs";
import { getPlatformShortcut } from '../../helpers/platformCustomization'
import { captureEvent, GLOBAL_EVENTS } from '../../tracking';
import { capture } from '../../helpers/screenCapture/extensionCapture';
import { TelemetryToggle } from './Settings';

interface HighlightItem {
  content: React.ReactNode;
  top: string;
  arrow: boolean;
}

const FeatureHighlightBubble = ({items}: {items: HighlightItem[]}) => {
  const [isVisibile, setIsVisible] = useState(true)
  const [hintIdx, setHintIdx] = useState(0)
  const numHints = items.length
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) {
          handleNext();
          return 0;
        }
        return prevProgress + 0.5;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [hintIdx]);

  const handleNext = () => {
    setHintIdx((hintIdx + 1) % numHints)
    setProgress(0);
  };
  
  return (
    isVisibile && <Box position="absolute"
      top={items[hintIdx].top}
      >
      {
        items[hintIdx].arrow && 
        <Box
          position="absolute"
          left="-10px"
          top="20%"
          transform="translateY(-50%)"
          width="0"
          height="0"
          borderTop="10px solid transparent"
          borderBottom="10px solid transparent"
          borderRight="10px solid"
          borderRightColor={"minusxBW.600"}
        />
      }
      
      <VStack
        borderRadius="md"
        p={4}
        mr={4}
        position="relative"
        alignItems="flex-start"
        bg={"minusxBW.600"}
        color={"white"}
        // border={"1px solid"}
      >
        <CloseButton
          position="absolute"
          right={2}
          top={2}
          size="sm"
          onClick={() => setIsVisible(false)}
        />        
        {items[hintIdx].content}
        <HStack fontSize={"xs"} fontWeight={"bold"} alignItems={"center"} color={"minusxGreen.400"} width={"100%"} justifyContent={"space-between"}>
          <HStack fontSize={"xs"} fontWeight={"bold"} alignItems={"center"} color={"minusxGreen.400"}>
            <BsLightbulbFill/><Box>Pro Tip {hintIdx + 1}/{numHints}</Box>
          </HStack>
          <HStack fontSize={"xs"} fontWeight={"bold"} alignItems={"center"} color={"minusxGreen.400"}>
            <Text fontSize="xs">Next</Text>
            <IconButton icon={<BsArrowRight />} onClick={handleNext} variant={"ghost"} aria-label='next'/>

          </HStack>
          
        </HStack>
        <Progress
            value={progress}
            width="100%"
            height={1}
            position={"absolute"}
            left={0}
            bottom={0}
            borderRadius={5}
            colorScheme="minusxGreen"
            size="sm"
          />
        </VStack>
      
    </Box>
  );
};

const Auth = () => {
 
  const session_jwt = useSelector(state => state.auth.session_jwt)
  const [email, setEmail] = useState("");
  const [authJWT, setAuthJWT] = useState("");
  const [otp, setOTP] = useState("");
  const isOTPMode = authJWT ? true : false
  const handleVerifyOtp = () => {
    console.log('Login params are', authJWT, otp, session_jwt)
    captureEvent(GLOBAL_EVENTS.otp_attempted, { email, otp, authJWT })
    authModule.login(authJWT, otp, session_jwt).then(({ session_jwt, profile_id, email, is_new_user }) => {
      dispatch(login({
          session_jwt,
          profile_id,
          email,
      }))
      if (is_new_user) {
        captureEvent(GLOBAL_EVENTS.user_signup, { email, profile_id })
      } else {
        captureEvent(GLOBAL_EVENTS.user_login, { email, profile_id })
      }
      captureEvent(GLOBAL_EVENTS.otp_success, { email, otp, authJWT, is_new_user })
    }).catch((error) => {
      captureEvent(GLOBAL_EVENTS.otp_failed, { email, otp, authJWT })
    })
  }
  const otpInputRef = useRef<HTMLInputElement>(null);

  const handleSignin = () => {
    // capture email_entered event
    captureEvent(GLOBAL_EVENTS.email_entered, { email })
    authModule.verifyEmail(email).then(({auth_jwt}) => {
      setAuthJWT(auth_jwt)
      captureEvent(GLOBAL_EVENTS.otp_received, { email, auth_jwt })
    }).catch((error) => {
      captureEvent(GLOBAL_EVENTS.otp_sending_failed, { email })
    }).then(() => {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 0);
    })
  };

  const resetLogin = () => {
    captureEvent(GLOBAL_EVENTS.email_reset, { email })
    setAuthJWT("")
  }
  
  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  const hints = [
    {
      content: (
        <>
          <Box fontWeight="bold">Telemetry & Activity</Box>
          <VStack>
            <TelemetryToggle color="minusxBW.50"/>
            <HStack>
              <Text>We recommend keeping this on. You can always toggle it in the settings page.</Text>
            </HStack>
          </VStack>
        </>
      ),
      top: "50%",
      arrow: false
    },
    {
      content: (
        <>
          <Box fontWeight="bold">Toggle MinusX</Box>
          <VStack spacing={2}>
            <HStack>
              <Text>Click the <Text as="span" color="minusxGreen.400" fontWeight="bold">MinusX logo</Text>, or hit <Text color="minusxGreen.400" fontWeight="bold" as="span">{getPlatformShortcut()}</Text> to toggle the MinusX sidebar.</Text>
            </HStack>
          </VStack>
        </>
      ),
      top: "50%",
      arrow: true
    }
  ];

  return (
    <Box p={5} maxW="md" mx="auto" width={"350px"} height={"100%"} backgroundColor={"minusxBW.200"}
    borderWidth={1.5} borderLeftColor={"minusxBW.500"}>
      <Image src={logo} alt="MinusX" maxWidth='150px'/>
      <VStack spacing={4} mt={5} position={"relative"}>
        <Input
          type="email"
          placeholder="Email"
          aria-label="Enter Email"
          value={email}
          disabled={isOTPMode ? true : false}
          onChange={(e) => setEmail(e.target.value)}
          // just trigger the handleSignin function when enter is pressed in this input as well
          onKeyUp={(e) => {
            if (e.key === 'Enter') {
              handleSignin()
            }
          }}
          borderColor={"minusxBW.600"}
        />
        <Button colorScheme="minusxGreen" onClick={isOTPMode ? resetLogin : handleSignin} width="100%" aria-label={isOTPMode ? "Change Email" : "Sign in / Sign up"} isDisabled={!isValidEmail(email)}>
          {isOTPMode ? "Change Email" : "Sign in / Sign up"}
        </Button>
        {!isOTPMode && <Text textAlign={"center"} fontSize={"xs"} color={"minusxBW.900"}>We'll send you a code to verify your email address. We promise you'll start using MinusX in {"<"}30 secs!</Text>}
        {isOTPMode  && (
          <>
            <Input
              type="text"
              placeholder="Enter Code"
              aria-label="Enter Code"
              value={otp}
              onChange={(e) => setOTP(e.target.value)}
              ref={otpInputRef}
              // trigger the handleVerifyOtp function when enter is pressed in this input
              onKeyUp={(e) => {
                if (e.key === 'Enter') {
                  handleVerifyOtp()
                }
              }}
              borderColor={"minusxBW.600"}
            />
            <Button colorScheme="minusxBW" variant="outline" onClick={handleVerifyOtp} width="100%" aria-label="Verify Code">
              Verify Code
            </Button>
          </>
        )}
      </VStack>
      <FeatureHighlightBubble items={hints}/>
    </Box>
  );
};

export default Auth;
